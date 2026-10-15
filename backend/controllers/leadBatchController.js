const Opportunity = require('../models/Opportunity');
const User = require('../models/User');
const Project = require('../models/Project');
const Lead = require('../models/Lead');
const AssignmentHistory = require('../models/AssignmentHistory');
const AuditLog = require('../models/AuditLog');
const { checkUserBatchAccess } = require('../utils/batchAccessHelper');

// @desc    Get summary list of all import batches with lead counts, assigned owners, and projects
// @route   GET /api/admin/lead-batches
// @access  Private (admin, super_admin, director, team_lead)
const getLeadBatches = async (req, res, next) => {
  try {
    const isFullAdmin = ['super_admin', 'admin', 'director'].includes(req.user.role);
    const scopeFilter = isFullAdmin ? {} : (req.dataScope || {});

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
// @access  Private (admin, super_admin, director, team_lead)
const getBatchLeads = async (req, res, next) => {
  try {
    const { batchId } = req.params;
    const { search, stage, page = 1, limit = 500 } = req.query;

    const { checkUserBatchAccess } = require('../utils/batchAccessHelper');
    const hasAccess = await checkUserBatchAccess(batchId, req.user);
    if (!hasAccess) {
      return res.status(403).json({ message: "You don't have access to this batch" });
    }

    const isFullAdmin = ['super_admin', 'admin', 'director'].includes(req.user.role);
    const scopeFilter = isFullAdmin ? {} : (req.dataScope || {});

    const query = {
      ...scopeFilter
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
// @desc    Delete/Rollback an entire lead import batch or selected leads within a batch
// @route   DELETE /api/admin/lead-batches/:batchId
// @access  Private (admin, super_admin only)
const deleteLeadBatch = async (req, res, next) => {
  try {
    // 1. Strict admin-only enforcement
    const userRole = req.user?.role;
    if (!['admin', 'super_admin'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only administrators can delete lead lists or batches.'
      });
    }

    // 2. Extract batch identifier
    const rawBatchId = req.params?.batchId || req.query?.batchId || req.body?.batchId;
    const { leadIds } = req.body || {};

    if (!rawBatchId && (!leadIds || leadIds.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Batch identifier or lead IDs are required for deletion.'
      });
    }

    const batchId = rawBatchId ? decodeURIComponent(rawBatchId).trim() : null;
    const isManualBatch = batchId === 'MANUAL / WEBSITE' || batchId === 'manual' || !batchId;

    // 3. Build Opportunity match filter
    const oppMatchQuery = {};
    if (isManualBatch) {
      oppMatchQuery.importBatchId = { $in: [null, '', 'MANUAL / WEBSITE', 'manual'] };
    } else {
      oppMatchQuery.$or = [
        { importBatchId: batchId },
        { batchCode: batchId }
      ];
    }

    // If specific leadIds provided (drill-down selective delete)
    const isSelectiveDelete = Array.isArray(leadIds) && leadIds.length > 0;
    if (isSelectiveDelete) {
      oppMatchQuery._id = { $in: leadIds };
    }

    // 4. Fetch matching Opportunity IDs (lightweight projection, lean)
    const oppsToDelete = await Opportunity.find(oppMatchQuery).select('_id').lean();
    const oppIds = oppsToDelete.map((o) => o._id);

    const ImportBatch = require('../models/ImportBatch');
    const BatchAccess = require('../models/BatchAccess');

    if (oppIds.length === 0 && !isManualBatch) {
      // Even if no opportunities exist, clean up any stray ImportBatch or BatchAccess with this tag
      await Promise.all([
        ImportBatch.deleteMany({ $or: [{ batchId }, { batchName: batchId }] }),
        BatchAccess.deleteMany({ batchId })
      ]);

      return res.json({
        success: true,
        message: `Batch "${batchId}" had 0 active leads. Any leftover batch metadata has been removed.`,
        deletedCount: 0
      });
    }

    // 5. Delete Opportunities and Leads
    const leadMatchQuery = isManualBatch
      ? { importBatchId: { $in: [null, '', 'MANUAL / WEBSITE', 'manual'] } }
      : { importBatchId: batchId };

    if (isSelectiveDelete) {
      leadMatchQuery.resultingOpportunity = { $in: oppIds };
    }

    const [oppResult, leadResult] = await Promise.all([
      Opportunity.deleteMany({ _id: { $in: oppIds } }),
      Lead.deleteMany(leadMatchQuery)
    ]);

    // 6. If deleting the full batch, clean up ImportBatch & BatchAccess
    if (!isSelectiveDelete && !isManualBatch) {
      await Promise.all([
        ImportBatch.deleteMany({ $or: [{ batchId }, { batchName: batchId }] }),
        BatchAccess.deleteMany({ batchId })
      ]);
    }

    // 7. Cascading cleanup for related models in chunks of 1000 to prevent BSON query size limits
    const Activity = require('../models/Activity');
    const Followup = require('../models/Followup');
    const SiteVisit = require('../models/SiteVisit');
    const VisitReminder = require('../models/VisitReminder');
    const Task = require('../models/Task');
    const AssignmentHistory = require('../models/AssignmentHistory');
    const Notification = require('../models/Notification');

    const CHUNK_SIZE = 1000;
    for (let i = 0; i < oppIds.length; i += CHUNK_SIZE) {
      const chunk = oppIds.slice(i, i + CHUNK_SIZE);

      const siteVisits = await SiteVisit.find({ opportunity: { $in: chunk } }).select('_id').lean();
      const svIds = siteVisits.map((s) => s._id);

      await Promise.all([
        Activity.deleteMany({ opportunity: { $in: chunk } }),
        Followup.deleteMany({ opportunity: { $in: chunk } }),
        SiteVisit.deleteMany({ opportunity: { $in: chunk } }),
        svIds.length > 0 ? VisitReminder.deleteMany({ siteVisit: { $in: svIds } }) : Promise.resolve(),
        Task.deleteMany({ opportunity: { $in: chunk } }),
        AssignmentHistory.deleteMany({ opportunity: { $in: chunk } }),
        Notification.deleteMany({ 'data.opportunityId': { $in: chunk } })
      ]);
    }

    // 8. Record in AuditLog
    try {
      const AuditLog = require('../models/AuditLog');
      await AuditLog.create({
        user: req.user._id,
        action: isSelectiveDelete ? 'DELETE_SELECTED_BATCH_LEADS' : 'DELETE_LEAD_BATCH',
        entity: 'Opportunity',
        reason: req.body?.reason || (isSelectiveDelete ? `Admin deleted selected leads from ${batchId || 'MANUAL'}` : `Admin deleted lead batch ${batchId || 'MANUAL'}`),
        metadata: {
          batchId: batchId || 'MANUAL / WEBSITE',
          deletedOpportunitiesCount: oppResult.deletedCount,
          deletedLeadsCount: leadResult.deletedCount,
          isSelectiveDelete,
          deletedBy: {
            _id: req.user._id,
            name: req.user.name,
            role: req.user.role
          }
        }
      });
    } catch (auditErr) {
      console.error('AuditLog error during batch deletion:', auditErr);
    }

    const label = isSelectiveDelete
      ? `${oppResult.deletedCount} selected lead(s)`
      : `lead list "${batchId || 'MANUAL / WEBSITE'}" (${oppResult.deletedCount} leads)`;

    return res.json({
      success: true,
      message: `Successfully deleted ${label}.`,
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


