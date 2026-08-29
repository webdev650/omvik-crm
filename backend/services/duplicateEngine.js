const Customer = require('../models/Customer');
const Opportunity = require('../models/Opportunity');
const Lead = require('../models/Lead');
const AuditLog = require('../models/AuditLog');
const normalizePhone = require('../utils/normalizePhone');

/**
 * Process incoming lead and ensure race-condition safe duplicate management.
 * @param {Object} leadInput - Lead payload (rawName, rawMobile, project, source, campaign, etc.)
 * @param {Object} submittingUser - Authenticated user submitting the lead
 */
async function processIncomingLead(leadInput, submittingUser) {
  const cleanMobile = normalizePhone(leadInput.rawMobile);

  if (!cleanMobile) {
    throw new Error('Valid primary mobile number is required');
  }

  // 1. Find or create Customer
  let customer = await Customer.findOne({
    $or: [
      { primaryMobile: cleanMobile },
      { alternateMobile: cleanMobile },
      { whatsapp: cleanMobile }
    ]
  });

  if (!customer) {
    customer = await Customer.create({
      name: leadInput.rawName || 'Prospect',
      primaryMobile: cleanMobile,
      email: leadInput.email || '',
      city: leadInput.city || ''
    });
  }

  // 2. Super Admin Duplicate Override: If requested by super_admin/admin with allowDuplicate: true,
  // call overrideDuplicate helper if an active opportunity exists
  if (leadInput.allowDuplicate && submittingUser && ['super_admin', 'admin'].includes(submittingUser.role)) {
    const existingActive = await Opportunity.findOne({
      customer: customer._id,
      project: leadInput.project,
      isActive: true
    });

    if (existingActive) {
      const overrideResult = await overrideDuplicate(
        customer._id,
        leadInput.project,
        leadInput.owner || null,
        leadInput.reason || 'Super Admin Duplicate Override on incoming lead',
        submittingUser
      );
      return {
        isDuplicate: false,
        isOverridden: true,
        opportunity: overrideResult.opportunity,
        previousOpportunity: overrideResult.previousOpportunity,
        customer,
        lead: overrideResult.lead,
        auditLog: overrideResult.auditLog
      };
    }
  }

  // 3. Ensure Mongoose unique index build is finished
  await Opportunity.init();

  // 4. Pre-check for existing active opportunity for this customer & project
  const existingActive = await Opportunity.findOne({
    customer: customer._id,
    project: leadInput.project,
    isActive: true
  })
    .populate('owner', 'name email role')
    .populate('project', 'name code');

  if (existingActive) {
    const customerName = customer.name || leadInput.rawName || 'Prospect';
    const projectName = existingActive.project?.name || 'Selected Project';
    const existingOwner = existingActive.owner?.name || 'Unassigned';
    const existingStage = existingActive.stage || 'new';

    const lead = await Lead.create({
      rawName: leadInput.rawName,
      rawMobile: leadInput.rawMobile,
      project: leadInput.project,
      source: leadInput.source,
      campaign: leadInput.campaign,
      duplicateStatus: 'blocked',
      matchedCustomer: customer._id,
      resultingOpportunity: existingActive._id
    });

    try {
      const DuplicateAttemptLog = require('../models/DuplicateAttemptLog');
      await DuplicateAttemptLog.create({
        rawName: leadInput.rawName,
        rawMobile: leadInput.rawMobile,
        project: leadInput.project,
        source: leadInput.source,
        matchedCustomer: customer._id,
        existingOpportunity: existingActive._id
      });
    } catch (logErr) {
      console.error('Error logging duplicate attempt:', logErr);
    }

    return {
      isDuplicate: true,
      customerName,
      projectName,
      existingOwner,
      existingStage,
      existingOpportunity: existingActive,
      customer,
      lead
    };
  }

  // 5. Attempt direct Opportunity creation (Atomic DB constraint enforcement)
  try {
    let opportunity = await Opportunity.create({
      customer: customer._id,
      project: leadInput.project,
      owner: leadInput.owner || null,
      source: leadInput.source || 'direct',
      campaign: leadInput.campaign || '',
      stage: 'new',
      isActive: true
    });

    // Run rule-based auto-assignment if no explicit owner was provided
    if (!opportunity.owner) {
      const { autoAssign } = require('./assignmentEngine');
      opportunity = await autoAssign(opportunity);
    }

    await opportunity.populate('owner', 'name email role');
    await opportunity.populate('project', 'name code');

    // Record Lead as no_match
    const lead = await Lead.create({
      rawName: leadInput.rawName,
      rawMobile: leadInput.rawMobile,
      project: leadInput.project,
      source: leadInput.source,
      campaign: leadInput.campaign,
      duplicateStatus: 'no_match',
      matchedCustomer: customer._id,
      resultingOpportunity: opportunity._id
    });

    return {
      isDuplicate: false,
      opportunity,
      customer,
      lead
    };
  } catch (err) {
    // 6. Handle Mongo Duplicate Key Error (code 11000 fallback)
    if (err.code === 11000) {
      const existingOpportunity = await Opportunity.findOne({
        customer: customer._id,
        project: leadInput.project,
        isActive: true
      })
        .populate('owner', 'name email role')
        .populate('project', 'name code');

      const customerName = customer.name || leadInput.rawName || 'Prospect';
      const projectName = existingOpportunity?.project?.name || 'Selected Project';
      const existingOwner = existingOpportunity?.owner?.name || 'Unassigned';
      const existingStage = existingOpportunity?.stage || 'new';

      const lead = await Lead.create({
        rawName: leadInput.rawName,
        rawMobile: leadInput.rawMobile,
        project: leadInput.project,
        source: leadInput.source,
        campaign: leadInput.campaign,
        duplicateStatus: 'blocked',
        matchedCustomer: customer._id,
        resultingOpportunity: existingOpportunity ? existingOpportunity._id : null
      });

      // Log attempt to Duplicate Monitor log
      try {
        const DuplicateAttemptLog = require('../models/DuplicateAttemptLog');
        await DuplicateAttemptLog.create({
          rawName: leadInput.rawName,
          rawMobile: leadInput.rawMobile,
          project: leadInput.project,
          source: leadInput.source,
          matchedCustomer: customer._id,
          existingOpportunity: existingOpportunity ? existingOpportunity._id : null
        });
      } catch (logErr) {
        console.error('Error logging duplicate attempt:', logErr);
      }

      return {
        isDuplicate: true,
        customerName,
        projectName,
        existingOwner,
        existingStage,
        existingOpportunity,
        customer,
        lead
      };
    }

    throw err;
  }
}

/**
 * Super Admin Override Duplicate Flow:
 * Deactivates existing active opportunity, creates new active opportunity with new owner,
 * links supersededBy relationship, and appends an immutable AuditLog entry.
 */
async function overrideDuplicate(customerId, projectId, newOwnerId, reason, overridingUser) {
  if (!reason || !reason.trim()) {
    throw new Error('Override reason is required');
  }

  if (!overridingUser || !['super_admin', 'admin'].includes(overridingUser.role)) {
    throw new Error('Only super_admin or admin roles can override duplicate blocks');
  }

  const existingOpportunity = await Opportunity.findOne({
    customer: customerId,
    project: projectId,
    isActive: true
  });

  if (!existingOpportunity) {
    throw new Error('No active opportunity found for this customer and project');
  }

  // 1. Create new opportunity
  const newOpportunity = await Opportunity.create({
    customer: customerId,
    project: projectId,
    owner: newOwnerId || overridingUser._id,
    stage: 'new',
    isActive: true,
    supersedesOpportunity: existingOpportunity._id,
    overrideReason: reason
  });

  await newOpportunity.populate('owner', 'name email role');
  await newOpportunity.populate('project', 'name code');

  // 2. Deactivate previous opportunity & mark supersededBy
  existingOpportunity.isActive = false;
  existingOpportunity.supersededByOpportunity = newOpportunity._id;
  await existingOpportunity.save();

  // 3. Create AuditLog entry
  const auditLog = await AuditLog.create({
    action: 'SUPER_ADMIN_DUPLICATE_OVERRIDE',
    actor: overridingUser._id,
    targetModel: 'Opportunity',
    targetId: newOpportunity._id,
    details: {
      customerId,
      projectId,
      previousOpportunityId: existingOpportunity._id,
      previousOwnerId: existingOpportunity.owner,
      newOwnerId: newOpportunity.owner,
      reason
    }
  });

  // 4. Record Lead as overridden
  const customer = await Customer.findById(customerId);
  const lead = await Lead.create({
    rawName: customer ? customer.name : 'Prospect',
    rawMobile: customer ? customer.primaryMobile : '',
    project: projectId,
    duplicateStatus: 'overridden',
    matchedCustomer: customerId,
    resultingOpportunity: newOpportunity._id,
    overrideReason: reason,
    overriddenBy: overridingUser._id
  });

  return {
    opportunity: newOpportunity,
    previousOpportunity: existingOpportunity,
    auditLog,
    lead
  };
}

module.exports = {
  processIncomingLead,
  overrideDuplicate
};
