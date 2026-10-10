const Opportunity = require('../models/Opportunity');
const User = require('../models/User');
const Project = require('../models/Project');
const AuditLog = require('../models/AuditLog');
const AssignmentHistory = require('../models/AssignmentHistory');
const Activity = require('../models/Activity');
const mongoose = require('mongoose');

/**
 * GET /api/import-history
 * Query all opportunities where importBatchId is not null, grouped by batch.
 * @access Private (admin, super_admin, director)
 */
const getImportHistory = async (req, res, next) => {
  try {
    const { startDate, endDate, assignedTo } = req.query;

    const matchQuery = {
      importBatchId: { $ne: null, $exists: true, $nin: ['', null] }
    };

    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999);
        matchQuery.createdAt.$lte = eDate;
      }
    }

    if (assignedTo && assignedTo !== 'all') {
      if (mongoose.Types.ObjectId.isValid(assignedTo)) {
        matchQuery.owner = new mongoose.Types.ObjectId(assignedTo);
      }
    }

    const batchAgg = await Opportunity.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$importBatchId',
          uploadedAt: { $min: '$createdAt' },
          lastUpdatedAt: { $max: '$updatedAt' },
          leadCount: { $sum: 1 },
          owners: { $addToSet: '$owner' },
          creators: { $addToSet: '$createdBy' },
          stages: { $push: '$stage' },
          intents: { $push: '$intent' }
        }
      },
      { $sort: { uploadedAt: -1 } }
    ]);

    const resultBatches = await Promise.all(
      batchAgg.map(async (b) => {
        const batchId = b._id;
        const ownerIds = (b.owners || []).filter(Boolean);
        const creatorIds = (b.creators || []).filter(Boolean);

        const [owners, creators] = await Promise.all([
          User.find({ _id: { $in: ownerIds } }).select('name email employeeId role'),
          User.find({ _id: { $in: creatorIds } }).select('name email employeeId role')
        ]);

        const uploadedBy = creators.length > 0 ? creators[0] : (owners.length > 0 ? owners[0] : { name: 'System Admin', email: 'admin@omvik.com' });

        let assignedToInfo = 'Auto Round-Robin';
        if (owners.length === 1) {
          assignedToInfo = owners[0];
        } else if (owners.length > 1) {
          assignedToInfo = owners;
        }

        // Status counts
        const stages = b.stages || [];
        const inPipeline = stages.filter((s) => !['won', 'lost'].includes(s)).length;
        const won = stages.filter((s) => s === 'won').length;
        const lost = stages.filter((s) => s === 'lost').length;

        const currentStatusText = `${inPipeline} In Pipeline, ${won} Won, ${lost} Lost`;

        // Data quality calculation
        let dataQualityStatus = 'All Valid';
        if (lost > inPipeline) {
          dataQualityStatus = `${lost} Closed Lost`;
        }

        return {
          importBatchId: batchId,
          uploadedAt: b.uploadedAt,
          uploadedBy,
          assignedTo: assignedToInfo,
          leadCount: b.leadCount,
          dataQualityStatus,
          currentStatus: currentStatusText,
          statusCounts: {
            inPipeline,
            won,
            lost
          },
          actions: ['View Details', 'Reassign', 'Download CSV']
        };
      })
    );

    res.json({
      success: true,
      count: resultBatches.length,
      batches: resultBatches
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/import-history/:batchId/leads
 * Return all opportunities in that batch with detailed status
 * @access Private (admin, super_admin, director)
 */
const getBatchLeadsDetail = async (req, res, next) => {
  try {
    const { batchId } = req.params;

    const query = { importBatchId: batchId };
    if (batchId === 'MANUAL / WEBSITE' || batchId === 'manual') {
      query.importBatchId = { $in: [null, '', 'MANUAL / WEBSITE', 'manual'] };
    }

    const opportunities = await Opportunity.find(query)
      .populate('customer', 'name primaryMobile email city')
      .populate('project', 'name code')
      .populate('owner', 'name email role employeeId')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    const oppIds = opportunities.map((o) => o._id);

    // Fetch latest activities for each opportunity
    const latestActivities = await Activity.aggregate([
      { $match: { opportunity: { $in: oppIds } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$opportunity',
          lastActivityAt: { $first: '$createdAt' },
          lastNote: { $first: '$notes' }
        }
      }
    ]);

    const activityMap = new Map(latestActivities.map((a) => [a._id.toString(), a]));

    const leads = opportunities.map((opp) => {
      const act = activityMap.get(opp._id.toString());
      return {
        _id: opp._id,
        leadCode: opp.leadCode || '—',
        customerName: opp.customer?.name || 'Prospect',
        phone: opp.customer?.primaryMobile || 'N/A',
        email: opp.customer?.email || '',
        city: opp.customer?.city || '',
        projectName: opp.project?.name || 'N/A',
        currentOwner: opp.owner ? opp.owner.name : 'Unassigned',
        ownerId: opp.owner ? opp.owner._id : null,
        stage: opp.stage || 'new',
        intent: opp.intent || 'medium',
        lastActivityAt: act ? act.lastActivityAt : opp.updatedAt || opp.createdAt,
        lastNote: act ? act.lastNote : ''
      };
    });

    res.json({
      success: true,
      batchId,
      count: leads.length,
      leads
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/import-history/:batchId/reassign-options
 * Return current owner distribution and list of active eligible employees
 * @access Private (admin, super_admin, director)
 */
const getBatchReassignOptions = async (req, res, next) => {
  try {
    const { batchId } = req.params;

    const query = { importBatchId: batchId };
    if (batchId === 'MANUAL / WEBSITE' || batchId === 'manual') {
      query.importBatchId = { $in: [null, '', 'MANUAL / WEBSITE', 'manual'] };
    }

    const opps = await Opportunity.find(query).populate('owner', 'name email employeeId');

    const currentAssignment = {};
    const currentAssignmentNames = {};

    opps.forEach((opp) => {
      const ownerId = opp.owner ? opp.owner._id.toString() : 'unassigned';
      const ownerName = opp.owner ? opp.owner.name : 'Unassigned';
      currentAssignment[ownerId] = (currentAssignment[ownerId] || 0) + 1;
      currentAssignmentNames[ownerId] = ownerName;
    });

    // Fetch active telecallers and team leads
    const availableEmployees = await User.find({
      isActive: true,
      role: { $in: ['telecaller', 'team_lead', 'admin', 'director'] }
    })
      .select('name email employeeId role teamId')
      .populate('teamId', 'name');

    // Calculate current workload count per employee
    const employeesWithWorkload = await Promise.all(
      availableEmployees.map(async (emp) => {
        const currentLeadCount = await Opportunity.countDocuments({
          owner: emp._id,
          isActive: true
        });
        return {
          _id: emp._id,
          name: emp.name,
          email: emp.email,
          employeeId: emp.employeeId,
          role: emp.role,
          team: emp.teamId ? emp.teamId.name : 'General Pod',
          currentLeadCount
        };
      })
    );

    res.json({
      success: true,
      batchId,
      totalBatchLeads: opps.length,
      currentAssignment,
      currentAssignmentNames,
      availableEmployees: employeesWithWorkload
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/import-history/:batchId/reassign
 * Reassign batch or selected leads to a new owner
 * @access Private (admin, super_admin, director)
 */
const reassignBatchLeads = async (req, res, next) => {
  try {
    const { batchId } = req.params;
    const { selectedLeadIds, newOwner, reason } = req.body;

    if (!newOwner) {
      return res.status(400).json({ message: 'Target newOwner user ID is required' });
    }

    const targetUser = await User.findById(newOwner);
    if (!targetUser || !targetUser.isActive) {
      return res.status(404).json({ message: 'Target user for reassignment not found or inactive' });
    }

    const query = { importBatchId: batchId };
    if (batchId === 'MANUAL / WEBSITE' || batchId === 'manual') {
      query.importBatchId = { $in: [null, '', 'MANUAL / WEBSITE', 'manual'] };
    }

    if (Array.isArray(selectedLeadIds) && selectedLeadIds.length > 0) {
      query._id = { $in: selectedLeadIds };
    }

    const opportunities = await Opportunity.find(query).populate('owner', 'name email');

    if (opportunities.length === 0) {
      return res.status(404).json({ message: 'No matching leads found in batch for reassignment' });
    }

    const updatedLeadIds = [];
    const historyEntries = [];

    for (const opp of opportunities) {
      const previousOwnerId = opp.owner ? opp.owner._id : null;
      opp.owner = targetUser._id;
      await opp.save();

      updatedLeadIds.push(opp._id);

      historyEntries.push({
        opportunity: opp._id,
        assignedTo: targetUser._id,
        assignedBy: req.user._id,
        previousOwner: previousOwnerId,
        reason: reason || 'Batch Reassignment'
      });
    }

    // Insert Assignment History entries
    if (historyEntries.length > 0) {
      await AssignmentHistory.insertMany(historyEntries);
    }

    // Insert AuditLog
    await AuditLog.create({
      user: req.user._id,
      action: 'BATCH_REASSIGNMENT',
      entity: 'Opportunity',
      entityId: opportunities[0]._id,
      reason: `Batch ${batchId} reassignment of ${updatedLeadIds.length} leads to ${targetUser.name} (${targetUser.email}). Reason: ${reason || 'Workload balancing'}`,
      metadata: {
        batchId,
        reassignedCount: updatedLeadIds.length,
        newOwnerId: targetUser._id,
        newOwnerName: targetUser.name,
        reason: reason || 'Workload balancing'
      }
    });

    // Calculate new current assignment map for this batch
    const allBatchOpps = await Opportunity.find({ importBatchId: batchId }).populate('owner', 'name');
    const newAssignment = {};
    allBatchOpps.forEach((o) => {
      const name = o.owner ? o.owner.name : 'Unassigned';
      newAssignment[name] = (newAssignment[name] || 0) + 1;
    });

    res.json({
      success: true,
      message: `Successfully reassigned ${updatedLeadIds.length} lead${updatedLeadIds.length !== 1 ? 's' : ''} to ${targetUser.name}`,
      reassignedCount: updatedLeadIds.length,
      newOwner: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email
      },
      newAssignment
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getImportHistory,
  getBatchLeadsDetail,
  getBatchReassignOptions,
  reassignBatchLeads
};
