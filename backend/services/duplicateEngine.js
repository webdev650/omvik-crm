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
    $or: [{ primaryMobile: cleanMobile }, { alternateMobile: cleanMobile }]
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

  // 4. Attempt direct Opportunity creation (Atomic DB constraint enforcement)
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
    // 5. Handle Mongo Duplicate Key Error (code 11000)
    if (err.code === 11000) {
      const existingOpportunity = await Opportunity.findOne({
        customer: customer._id,
        project: leadInput.project,
        isActive: true
      }).populate('owner', 'name email role');

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

      return {
        isDuplicate: true,
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

  // 1. Find existing active opportunity
  const existingOpp = await Opportunity.findOne({
    customer: customerId,
    project: projectId,
    isActive: true
  }).populate('owner', 'name email role');

  if (!existingOpp) {
    throw new Error('No active opportunity found for this customer and project to override');
  }

  const oldOwnerId = existingOpp.owner ? (existingOpp.owner._id || existingOpp.owner) : null;

  // 2. Deactivate old opportunity using updateOne to satisfy partial unique index
  await Opportunity.updateOne({ _id: existingOpp._id }, { isActive: false });

  let newOpp;
  try {
    newOpp = await Opportunity.create({
      customer: customerId,
      project: projectId,
      owner: newOwnerId || null,
      stage: 'new',
      isActive: true,
      source: 'duplicate_override'
    });

    // Run auto-assignment if no explicit new owner provided
    if (!newOpp.owner) {
      const { autoAssign } = require('./assignmentEngine');
      newOpp = await autoAssign(newOpp);
    }

    await newOpp.populate('owner', 'name email role');

    // Link old opportunity to new one via supersededBy
    await Opportunity.updateOne(
      { _id: existingOpp._id },
      { supersededBy: newOpp._id }
    );
    existingOpp.isActive = false;
    existingOpp.supersededBy = newOpp._id;

    // 3. Create AuditLog entry
    const auditLog = await AuditLog.create({
      user: overridingUser._id,
      action: 'duplicate_override',
      entity: 'Opportunity',
      entityId: newOpp._id,
      reason: reason.trim(),
      metadata: {
        oldOpportunityId: existingOpp._id,
        oldOwnerId,
        newOwnerId: newOpp.owner ? (newOpp.owner._id || newOpp.owner) : null,
        customerId,
        projectId
      }
    });

    // 4. Record Lead entry for tracking
    const lead = await Lead.create({
      rawName: 'Duplicate Override',
      rawMobile: 'N/A',
      project: projectId,
      source: 'duplicate_override',
      duplicateStatus: 'override_approved',
      matchedCustomer: customerId,
      resultingOpportunity: newOpp._id
    });

    return {
      success: true,
      opportunity: newOpp,
      previousOpportunity: existingOpp,
      auditLog,
      lead
    };
  } catch (err) {
    console.error('[overrideDuplicate internal error]:', err);
    if (newOpp) {
      await Opportunity.deleteOne({ _id: newOpp._id });
    }
    await Opportunity.updateOne(
      { _id: existingOpp._id },
      { isActive: true, supersededBy: null }
    );
    throw err;
  }
}

module.exports = {
  processIncomingLead,
  overrideDuplicate
};
