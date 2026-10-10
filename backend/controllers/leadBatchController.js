// @desc    Get summary list of all import batches with lead counts, assigned owners, and projects
// @route   GET /api/admin/lead-batches
// @access  Private (admin, super_admin, director)
const getLeadBatches = async (req, res, next) => {
  try {
    const scopeFilter = req.dataScope || {};

    const batchAgg = await Opportunity.aggregate([
      { $match: scopeFilter },
      {
        $group: {
          _id: { $ifNull: ['$importBatchId', 'MANUAL / WEBSITE'] },
          totalLeads: { $sum: 1 },
          activeLeads: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
          wonDeals: { $sum: { $cond: [{ $eq: ['$stage', 'won'] }, 1, 0] } },
          lastImportedAt: { $max: '$createdAt' },
          owners: { $addToSet: '$owner' },
          projectIds: { $addToSet: '$project' }
        }
      },
      { $sort: { lastImportedAt: -1 } }
    ]);

    const User = require('../models/User');
    const Project = require('../models/Project');

    const batches = await Promise.all(
      batchAgg.map(async (b) => {
        const ownerIds = (b.owners || []).filter(Boolean);
        const projectIds = (b.projectIds || []).filter(Boolean);

        const [users, projects] = await Promise.all([
          User.find({ _id: { $in: ownerIds } }).select('name email employeeId role'),
          Project.find({ _id: { $in: projectIds } }).select('name code')
        ]);

        return {
          batchId: b._id,
          batchName: b._id,
          totalLeads: b.totalLeads,
          activeLeads: b.activeLeads,
          wonDeals: b.wonDeals,
          lastImportedAt: b.lastImportedAt,
          assignedOwners: users,
          projects: projects
        };
      })
    );

    res.json({
      success: true,
      count: batches.length,
      batches
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get leads inside a specific import batch with search/filtering
// @route   GET /api/admin/lead-batches/:batchId
// @access  Private (admin, super_admin, director)
const getBatchLeads = async (req, res, next) => {
  try {
    const { batchId } = req.params;
    const { search, stage, page = 1, limit = 100 } = req.query;

    const query = {
      ...(req.dataScope || {})
    };

    if (batchId === 'MANUAL / WEBSITE' || batchId === 'manual') {
      query.importBatchId = { $in: [null, '', 'MANUAL / WEBSITE', 'manual'] };
    } else {
      query.importBatchId = batchId;
    }

    if (stage) {
      query.stage = stage;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [total, opportunities] = await Promise.all([
      Opportunity.countDocuments(query),
      Opportunity.find(query)
        .populate('customer', 'name primaryMobile email city')
        .populate('project', 'name code')
        .populate('owner', 'name email role employeeId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
    ]);

    // Optional in-memory filter if customer search term provided
    let filteredOpps = opportunities;
    if (search && String(search).trim()) {
      const q = String(search).trim().toLowerCase();
      filteredOpps = opportunities.filter(
        (opp) =>
          opp.customer?.name?.toLowerCase().includes(q) ||
          opp.customer?.primaryMobile?.includes(q) ||
          opp.project?.name?.toLowerCase().includes(q) ||
          opp.owner?.name?.toLowerCase().includes(q) ||
          opp.owner?.employeeId?.toLowerCase().includes(q)
      );
    }

    res.json({
      success: true,
      batchId,
      total,
      count: filteredOpps.length,
      opportunities: filteredOpps
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reassign all or selected leads in a batch to a specific employee
// @route   POST /api/admin/lead-batches/:batchId/reassign
// @access  Private (admin, super_admin, director, team_lead)
const reassignBatchLeads = async (req, res, next) => {
  try {
    const { batchId } = req.params;
    const { newOwnerId, leadIds, reason } = req.body;

    if (!newOwnerId) {
      return res.status(400).json({ message: 'Target new owner ID is required' });
    }

    const User = require('../models/User');
    const AssignmentHistory = require('../models/AssignmentHistory');
    const AuditLog = require('../models/AuditLog');

    const targetUser = await User.findById(newOwnerId);
    if (!targetUser) {
      return res.status(404).json({ message: 'Target user account not found' });
    }

    const query = {
      ...(req.dataScope || {})
    };

    if (batchId === 'MANUAL / WEBSITE' || batchId === 'manual') {
      query.importBatchId = { $in: [null, '', 'MANUAL / WEBSITE', 'manual'] };
    } else {
      query.importBatchId = batchId;
    }

    if (Array.isArray(leadIds) && leadIds.length > 0) {
      query._id = { $in: leadIds };
    }

    const oppsToReassign = await Opportunity.find(query);

    if (oppsToReassign.length === 0) {
      return res.status(404).json({ message: 'No matching leads found in batch for reassignment' });
    }

    let reassignedCount = 0;
    for (const opp of oppsToReassign) {
      const oldOwnerId = opp.owner;
      if (String(oldOwnerId) !== String(newOwnerId)) {
        opp.owner = newOwnerId;
        await opp.save();
        reassignedCount++;

        // Record Assignment History
        try {
          await AssignmentHistory.create({
            opportunity: opp._id,
            previousOwner: oldOwnerId,
            newOwner: newOwnerId,
            assignedBy: req.user._id,
            reason: reason || `Batch reassignment from ${batchId}`
          });
        } catch (hErr) {
          console.error('Error logging AssignmentHistory:', hErr);
        }
      }
    }

    // Record AuditLog
    try {
      await AuditLog.create({
        action: 'BATCH_LEAD_REASSIGNMENT',
        actor: req.user._id,
        targetModel: 'Opportunity',
        details: {
          batchId,
          newOwnerId,
          newOwnerName: targetUser.name,
          reassignedCount,
          totalBatchMatches: oppsToReassign.length,
          reason
        }
      });
    } catch (auditErr) {
      console.error('AuditLog error during batch reassignment:', auditErr);
    }

    res.json({
      success: true,
      message: `Successfully reassigned ${reassignedCount} leads in batch "${batchId}" to ${targetUser.name}.`,
      reassignedCount,
      newOwner: {
        _id: targetUser._id,
        name: targetUser.name,
        employeeId: targetUser.employeeId
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete/Rollback an entire lead import batch and all its leads
// @route   DELETE /api/admin/lead-batches/:batchId
// @access  Private (admin, super_admin, director)
const deleteLeadBatch = async (req, res, next) => {
  try {
    const { batchId } = req.params;

    if (!batchId || batchId === 'MANUAL / WEBSITE' || batchId === 'manual') {
      return res.status(400).json({ message: 'Cannot delete manual/website batch' });
    }

    const Lead = require('../models/Lead');
    const query = {
      importBatchId: batchId,
      ...(req.dataScope || {})
    };

    // Find opportunities to delete
    const oppsToDelete = await Opportunity.find(query);
    const oppIds = oppsToDelete.map((o) => o._id);

    // Delete opportunities & related leads
    const [oppResult, leadResult] = await Promise.all([
      Opportunity.deleteMany({ _id: { $in: oppIds } }),
      Lead.deleteMany({ importBatchId: batchId })
    ]);

    // Record AuditLog
    try {
      const AuditLog = require('../models/AuditLog');
      await AuditLog.create({
        action: 'DELETE_LEAD_BATCH',
        actor: req.user._id,
        targetModel: 'Opportunity',
        details: {
          batchId,
          deletedOpportunitiesCount: oppResult.deletedCount,
          deletedLeadsCount: leadResult.deletedCount
        }
      });
    } catch (auditErr) {
      console.error('AuditLog error during batch deletion:', auditErr);
    }

    res.json({
      success: true,
      message: `Successfully deleted batch "${batchId}" (${oppResult.deletedCount} leads removed).`,
      deletedCount: oppResult.deletedCount
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLeadBatches,
  getBatchLeads,
  reassignBatchLeads,
  deleteLeadBatch
};


