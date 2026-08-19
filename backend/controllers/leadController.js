const { processIncomingLead, overrideDuplicate } = require('../services/duplicateEngine');

// @desc    Submit a new lead
// @route   POST /api/leads
// @access  Private
const submitLead = async (req, res, next) => {
  try {
    const { rawName, rawMobile, project, source, campaign, email, city, allowDuplicate } = req.body;

    if (!rawMobile || !project) {
      return res.status(400).json({
        message: 'rawMobile and project fields are required'
      });
    }

    const result = await processIncomingLead(
      { rawName, rawMobile, project, source, campaign, email, city, allowDuplicate },
      req.user
    );

    if (result.isDuplicate) {
      return res.status(409).json({
        success: false,
        message: 'Duplicate lead detected. An active opportunity already exists for this customer and project.',
        duplicateStatus: 'blocked',
        existingOpportunity: result.existingOpportunity,
        customer: result.customer
      });
    }

    res.status(201).json({
      success: true,
      message: 'Lead processed and opportunity created successfully.',
      opportunity: result.opportunity,
      customer: result.customer
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Super Admin Duplicate Override
// @route   POST /api/leads/override
// @access  Private (super_admin only)
const overrideDuplicateLead = async (req, res, next) => {
  try {
    const { customerId, projectId, newOwnerId, reason } = req.body;

    if (!customerId || !projectId) {
      return res.status(400).json({
        message: 'customerId and projectId are required for override'
      });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        message: 'Reason is required for super admin duplicate override'
      });
    }

    const result = await overrideDuplicate(
      customerId,
      projectId,
      newOwnerId || null,
      reason.trim(),
      req.user
    );

    res.status(201).json({
      success: true,
      message: 'Duplicate lead overridden successfully.',
      opportunity: result.opportunity,
      previousOpportunity: result.previousOpportunity,
      auditLog: result.auditLog
    });
  } catch (error) {
    console.error('[Override Error Stack]:', error);
    if (error.message && error.message.includes('No active opportunity found')) {
      return res.status(404).json({ message: error.message });
    }
    next(error);
  }
};

module.exports = {
  submitLead,
  overrideDuplicateLead
};
