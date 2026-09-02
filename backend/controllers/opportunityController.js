const Opportunity = require('../models/Opportunity');
const User = require('../models/User');
const AssignmentHistory = require('../models/AssignmentHistory');
const AuditLog = require('../models/AuditLog');

// @desc    Assign single opportunity to a user
// @route   PATCH /api/opportunities/:id/assign
// @access  Private (super_admin, director, admin, team_lead)
const assignOne = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required for assignment' });
    }

    const opportunity = await Opportunity.findById(id);
    if (!opportunity) {
      return res.status(404).json({ message: 'Opportunity not found' });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'Target user for assignment not found' });
    }

    if (!targetUser.isActive) {
      return res.status(400).json({ message: 'Target user is deactivated' });
    }

    // Update opportunity owner
    opportunity.owner = targetUser._id;
    await opportunity.save();

    // Audit assignment history
    const history = await AssignmentHistory.create({
      opportunity: opportunity._id,
      assignedTo: targetUser._id,
      assignedBy: req.user._id
    });

    // Record Audit Log for high-risk ownership assignment mutation
    await AuditLog.create({
      user: req.user._id,
      action: 'OPPORTUNITY_REASSIGNED',
      entity: 'Opportunity',
      entityId: opportunity._id,
      reason: `Reassigned opportunity to rep ${targetUser.name} (${targetUser.email})`,
      metadata: { targetUserId: targetUser._id, assignedBy: req.user._id }
    });

    res.json({
      success: true,
      message: 'Opportunity assigned successfully',
      opportunity,
      assignmentHistory: history
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all opportunities (filtered by data scope, stage, project, sorted newest first)
// @route   GET /api/opportunities
// @access  Private
const getOpportunities = async (req, res, next) => {
  try {
    const scopeFilter = req.dataScope || req.scopeFilter || {};
    const filter = { ...scopeFilter };

    if (req.query.stage) {
      filter.stage = req.query.stage;
    }

    if (req.query.project) {
      filter.project = req.query.project;
    }

    const opportunities = await Opportunity.find(filter)
      .populate('customer', 'name primaryMobile')
      .populate('project', 'name location')
      .populate('owner', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: opportunities.length,
      opportunities
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single opportunity by ID (scoped — telecaller can't access others' opportunities)
// @route   GET /api/opportunities/:id
// @access  Private
const getOpportunityById = async (req, res, next) => {
  try {
    const scopeFilter = req.dataScope || req.scopeFilter || {};

    const opportunity = await Opportunity.findOne({
      _id: req.params.id,
      ...scopeFilter
    })
      .populate('customer')
      .populate('project', 'name code location')
      .populate('owner', 'name email role');

    if (!opportunity) {
      return res.status(404).json({ message: 'Opportunity not found' });
    }

    res.json({
      success: true,
      opportunity
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk assign opportunities to multiple users by count
// @route   PATCH /api/opportunities/bulk-assign
// @access  Private (super_admin, director, admin, team_lead)
const bulkAssign = async (req, res, next) => {
  try {
    const { opportunityIds, assignments } = req.body;

    if (!Array.isArray(opportunityIds) || opportunityIds.length === 0) {
      return res.status(400).json({ message: 'opportunityIds array is required' });
    }

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({ message: 'assignments array is required' });
    }

    let unassignedPool = [...opportunityIds];
    const historyToInsert = [];
    const assignedBatches = [];

    for (const item of assignments) {
      const { userId, count } = item;
      if (!userId || !count || count <= 0) continue;

      const batch = unassignedPool.splice(0, count);
      if (batch.length === 0) break;

      // Bulk update opportunities
      await Opportunity.updateMany(
        { _id: { $in: batch } },
        { owner: userId }
      );

      // Prepare assignment history documents
      batch.forEach((oppId) => {
        historyToInsert.push({
          opportunity: oppId,
          assignedTo: userId,
          assignedBy: req.user._id
        });
      });

      assignedBatches.push({
        userId,
        assignedCount: batch.length,
        opportunityIds: batch
      });
    }

    // Bulk insert history records
    if (historyToInsert.length > 0) {
      await AssignmentHistory.insertMany(historyToInsert);
    }

    res.json({
      success: true,
      message: 'Bulk assignment processed successfully',
      totalAssigned: historyToInsert.length,
      remainingUnassigned: unassignedPool.length,
      batches: assignedBatches
    });
  } catch (error) {
    next(error);
  }
};

const VALID_STAGES = ['new', 'contacted', 'qualified', 'site_visit', 'negotiation', 'nurture', 'won', 'lost'];
const CLOSED_STAGES = ['won', 'lost'];

// @desc    Update stage of a single opportunity (Kanban drag or manual)
// @route   PATCH /api/opportunities/:id/stage
// @access  Private (scoped — can only move opportunities you own/manage)
const updateStage = async (req, res, next) => {
  try {
    const { stage, lostReason } = req.body;
    const scopeFilter = req.dataScope || req.scopeFilter || {};

    if (!stage || !VALID_STAGES.includes(stage)) {
      return res.status(400).json({
        message: `Invalid stage. Must be one of: ${VALID_STAGES.join(', ')}`
      });
    }

    if (stage === 'lost' && (!lostReason || !lostReason.trim())) {
      return res.status(400).json({
        message: "A lostReason is required when moving an opportunity to 'lost'"
      });
    }

    const opportunity = await Opportunity.findOne({ _id: req.params.id, ...scopeFilter });
    if (!opportunity) {
      return res.status(404).json({ message: 'Opportunity not found' });
    }

    opportunity.stage = stage;

    if (CLOSED_STAGES.includes(stage)) {
      opportunity.isActive = false;
      opportunity.closedAt = new Date();
    }

    if (stage === 'lost') {
      opportunity.lostReason = lostReason.trim();
    }

    await opportunity.save();

    res.json({
      success: true,
      message: `Stage updated to '${stage}'`,
      opportunity
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update intent of a single opportunity ('high', 'medium', 'low')
// @route   PATCH /api/opportunities/:id/intent
// @access  Private
const updateIntent = async (req, res, next) => {
  try {
    const { intent } = req.body;
    const scopeFilter = req.dataScope || req.scopeFilter || {};

    if (!['high', 'medium', 'low'].includes(intent)) {
      return res.status(400).json({ message: 'Invalid intent level. Must be high, medium, or low.' });
    }

    const opportunity = await Opportunity.findOne({ _id: req.params.id, ...scopeFilter });
    if (!opportunity) {
      return res.status(404).json({ message: 'Opportunity not found' });
    }

    opportunity.intent = intent;
    await opportunity.save();

    res.json({
      success: true,
      message: `Intent level updated to ${intent}`,
      opportunity
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  assignOne,
  bulkAssign,
  getOpportunities,
  getOpportunityById,
  updateStage,
  updateIntent
};
