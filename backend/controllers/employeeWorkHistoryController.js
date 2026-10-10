const Opportunity = require('../models/Opportunity');
const User = require('../models/User');
const Activity = require('../models/Activity');
const SiteVisit = require('../models/SiteVisit');
const mongoose = require('mongoose');

/**
 * GET /api/employees/:empId/work-history
 * Returns timeline of all batches assigned to or created by an employee
 * @access Private (admin, super_admin, director, or self telecaller/team_lead)
 */
const getEmployeeWorkHistory = async (req, res, next) => {
  try {
    const { empId } = req.params;
    const { startDate, endDate } = req.query;

    // Resolve user by ID or employeeId
    let user = null;
    if (mongoose.Types.ObjectId.isValid(empId)) {
      user = await User.findById(empId);
    }
    if (!user) {
      user = await User.findOne({ employeeId: empId });
    }
    if (!user) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Role-based security check: non-admins can ONLY view their OWN work history
    const isFullAdmin = ['super_admin', 'admin', 'director'].includes(req.user.role);
    if (!isFullAdmin && req.user._id.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden: You can only view your own work history' });
    }

    const matchQuery = {
      $or: [{ owner: user._id }, { createdBy: user._id }]
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

    const batchAgg = await Opportunity.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { $ifNull: ['$importBatchId', 'MANUAL / WEBSITE'] },
          assignedAt: { $min: '$createdAt' },
          leadCount: { $sum: 1 },
          stages: { $push: '$stage' },
          creators: { $addToSet: '$createdBy' }
        }
      },
      { $sort: { assignedAt: -1 } }
    ]);

    const creatorIds = Array.from(new Set(batchAgg.flatMap((b) => b.creators).filter(Boolean)));
    const creators = await User.find({ _id: { $in: creatorIds } }).select('name email');
    const creatorMap = new Map(creators.map((c) => [c._id.toString(), c]));

    const historyTimeline = batchAgg.map((b) => {
      const batchId = b._id;
      const stages = b.stages || [];
      const inPipeline = stages.filter((s) => !['won', 'lost'].includes(s)).length;
      const closedWon = stages.filter((s) => s === 'won').length;
      const closedLost = stages.filter((s) => s === 'lost').length;
      const total = b.leadCount;

      const conversionRateVal = total > 0 ? ((closedWon / total) * 100).toFixed(1) : '0';
      const conversionRate = `${conversionRateVal}%`;

      const creatorObj = b.creators.length > 0 ? creatorMap.get(b.creators[0].toString()) : null;
      const assignedBy = creatorObj ? creatorObj.email : 'system@omvik.com';

      return {
        batchId,
        date: b.assignedAt,
        event: 'Batch Assigned',
        leadCount: total,
        dataQualityStatus: 'All Valid',
        assignmentType: b.creators.length > 0 ? 'Direct Assignment' : 'Auto Round-Robin',
        assignedBy,
        currentStatus: {
          inPipeline,
          closedWon,
          closedLost,
          conversionRate
        }
      };
    });

    res.json({
      success: true,
      employee: {
        _id: user._id,
        name: user.name,
        email: user.email,
        employeeId: user.employeeId,
        role: user.role
      },
      timeline: historyTimeline
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/employees/:empId/batch-summary/:batchId
 * Return summary performance for an employee on a single batch
 * @access Private (admin, super_admin, director, or self)
 */
const getEmployeeBatchSummary = async (req, res, next) => {
  try {
    const { empId, batchId } = req.params;

    let user = null;
    if (mongoose.Types.ObjectId.isValid(empId)) {
      user = await User.findById(empId);
    }
    if (!user) {
      user = await User.findOne({ employeeId: empId });
    }
    if (!user) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const isFullAdmin = ['super_admin', 'admin', 'director'].includes(req.user.role);
    if (!isFullAdmin && req.user._id.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden: You can only view your own work history' });
    }

    const query = {
      $or: [{ owner: user._id }, { createdBy: user._id }]
    };

    if (batchId === 'MANUAL / WEBSITE' || batchId === 'manual') {
      query.importBatchId = { $in: [null, '', 'MANUAL / WEBSITE', 'manual'] };
    } else {
      query.importBatchId = batchId;
    }

    const opportunities = await Opportunity.find(query)
      .populate('customer', 'name primaryMobile email city')
      .populate('project', 'name code')
      .populate('owner', 'name email')
      .sort({ createdAt: -1 });

    if (opportunities.length === 0) {
      return res.status(404).json({ message: 'No leads found for this employee in specified batch' });
    }

    const oppIds = opportunities.map((o) => o._id);

    const [activitiesCount, siteVisitsCount, latestActivities] = await Promise.all([
      Activity.countDocuments({ opportunity: { $in: oppIds } }),
      SiteVisit.countDocuments({ opportunity: { $in: oppIds } }),
      Activity.aggregate([
        { $match: { opportunity: { $in: oppIds } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$opportunity', lastActivityAt: { $first: '$createdAt' } } }
      ])
    ]);

    const activityMap = new Map(latestActivities.map((a) => [a._id.toString(), a.lastActivityAt]));

    const totalLeads = opportunities.length;
    const contactedCount = opportunities.filter((o) => o.stage !== 'new').length;
    const closedWonCount = opportunities.filter((o) => o.stage === 'won').length;

    // Calculate average days to close for won leads
    let totalDaysToClose = 0;
    let wonWithClosedDate = 0;
    opportunities.forEach((o) => {
      if (o.stage === 'won') {
        const closedAt = o.closedAt || o.updatedAt;
        const diffMs = new Date(closedAt).getTime() - new Date(o.createdAt).getTime();
        const days = diffMs / (1000 * 60 * 60 * 24);
        totalDaysToClose += days;
        wonWithClosedDate++;
      }
    });

    const averageDaysToClose = wonWithClosedDate > 0 ? Number((totalDaysToClose / wonWithClosedDate).toFixed(1)) : 0;
    const conversionRateVal = totalLeads > 0 ? ((closedWonCount / totalLeads) * 100).toFixed(1) : '0';

    const leadList = opportunities.map((opp) => {
      const lastAct = activityMap.get(opp._id.toString());
      const now = new Date();
      const daysInPipeline = Math.max(1, Math.ceil((now.getTime() - new Date(opp.createdAt).getTime()) / (1000 * 60 * 60 * 24)));

      return {
        _id: opp._id,
        leadCode: opp.leadCode || '—',
        customerName: opp.customer?.name || 'Prospect',
        phone: opp.customer?.primaryMobile || 'N/A',
        projectName: opp.project?.name || 'N/A',
        stage: opp.stage || 'new',
        intent: opp.intent || 'medium',
        daysInPipeline,
        lastActivity: lastAct || opp.updatedAt || opp.createdAt,
        currentOwner: opp.owner ? opp.owner.name : 'Unassigned'
      };
    });

    res.json({
      success: true,
      batchId,
      receivedAt: opportunities[opportunities.length - 1].createdAt,
      leadCount: totalLeads,
      performance: {
        activityLogged: activitiesCount,
        contacted: contactedCount,
        contactedPercentage: `${totalLeads > 0 ? ((contactedCount / totalLeads) * 100).toFixed(0) : 0}%`,
        siteVisitsScheduled: siteVisitsCount,
        closedWon: closedWonCount,
        averageDaysToClose,
        conversionRate: `${conversionRateVal}%`
      },
      leads: leadList
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEmployeeWorkHistory,
  getEmployeeBatchSummary
};
