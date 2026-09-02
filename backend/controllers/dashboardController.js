const Opportunity = require('../models/Opportunity');
const Followup = require('../models/Followup');
const SiteVisit = require('../models/SiteVisit');
const User = require('../models/User');
const Project = require('../models/Project');

// Helper to build date match filter
const buildDateFilter = (startDate, endDate, preset) => {
  const now = new Date();
  let start = null;
  let end = null;

  if (preset === 'this_month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  } else if (preset === 'this_year') {
    start = new Date(now.getFullYear(), 0, 1);
    end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  } else if (startDate || endDate) {
    if (startDate) start = new Date(startDate);
    if (endDate) {
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    }
  }

  if (start && end) {
    return { createdAt: { $gte: start, $lte: end } };
  } else if (start) {
    return { createdAt: { $gte: start } };
  } else if (end) {
    return { createdAt: { $lte: end } };
  }
  return {};
};

// @desc    Get comprehensive executive dashboard stats (8 stat cards, deep-dive project pie chart, best employee/project, overdue buckets)
// @route   GET /api/dashboard/summary
// @access  Private — scoped by role via applyDataScope
const getDashboardStats = async (req, res, next) => {
  try {
    const scopeFilter = req.dataScope || req.scopeFilter || {};
    const { projectId, employeeId, startDate, endDate, bestDateRange = 'this_month' } = req.query;

    const baseMatch = { ...scopeFilter, isActive: true };

    // Build project deep dive scope filter
    const deepDiveScope = { ...scopeFilter };
    if (projectId) deepDiveScope.project = projectId;
    if (employeeId) deepDiveScope.owner = employeeId;
    const dateQuery = buildDateFilter(startDate, endDate);
    const deepDiveMatch = { ...deepDiveScope, ...dateQuery };

    // Build best employee/project date query
    const bestDateQuery = buildDateFilter(null, null, bestDateRange);

    const now = new Date();
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const seventyTwoHoursAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);

    // Parallel aggregations & queries
    const [
      totalLeads,
      activeLeadsCount,
      inactiveLeadsCount,
      uncontactedLeadsCount,
      wonCount,
      lostCount,
      slaBreachedCount,
      stageAgg,
      projectAgg,
      sourceAgg,
      dueRecent,
      due1Day,
      due2To3Days,
      due4PlusDays,
      deepActive,
      deepInactive,
      deepBookings,
      deepContacted,
      deepSiteVisits,
      bestEmployeeAgg,
      bestProjectAgg,
      drillActiveList,
      drillInactiveList,
      drillUncontactedList,
      drillTotalList
    ] = await Promise.all([

      // 1a. TOTAL LEADS (cumulative across all employees ever created)
      Opportunity.countDocuments(scopeFilter),

      // 1d. ACTIVE LEADS (isActive=true AND intent in ['high','medium', null])
      Opportunity.countDocuments({
        ...scopeFilter,
        isActive: true,
        $or: [{ intent: { $in: ['high', 'medium'] } }, { intent: null }, { intent: { $exists: false } }]
      }),

      // 1e. INACTIVE LEADS (intent='low' OR stage='lost' OR isActive=false)
      Opportunity.countDocuments({
        ...scopeFilter,
        $or: [{ intent: 'low' }, { stage: 'lost' }, { isActive: false }]
      }),

      // 1g. UNCONTACTED LEADS (zero activities logged / lastContactedAt=null)
      Opportunity.countDocuments({
        ...scopeFilter,
        isActive: true,
        $or: [{ lastContactedAt: null }, { lastContactedAt: { $exists: false } }]
      }),

      // 1. Deals Won
      Opportunity.countDocuments({ ...scopeFilter, stage: 'won' }),

      // 1. Deals Lost
      Opportunity.countDocuments({ ...scopeFilter, stage: 'lost' }),

      // 1h. SLA Breached (>48h)
      Opportunity.countDocuments({ ...scopeFilter, isActive: true, slaBreached: true }),

      // Pipeline Funnel Aggregation by stage
      Opportunity.aggregate([
        { $match: baseMatch },
        { $group: { _id: '$stage', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),

      // Multi-project bar chart overview
      Opportunity.aggregate([
        { $match: baseMatch },
        { $group: { _id: '$project', count: { $sum: 1 } } },
        {
          $lookup: {
            from: 'projects',
            localField: '_id',
            foreignField: '_id',
            as: 'project'
          }
        },
        { $unwind: { path: '$project', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            count: 1,
            projectName: { $ifNull: ['$project.name', 'Unknown'] }
          }
        },
        { $sort: { count: -1 } }
      ]),

      // 2c. Normalized Lead Sources Pie Chart
      Opportunity.aggregate([
        { $match: baseMatch },
        {
          $project: {
            sourceUpper: { $toUpper: { $ifNull: ['$source', 'DIRECT'] } }
          }
        },
        { $group: { _id: '$sourceUpper', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),

      // 5a. Overdue Actions Bucket 1: Due in last few hours (0 - 6h overdue)
      Followup.countDocuments({
        owner: req.user._id,
        status: { $in: ['overdue', 'missed'] },
        dueDate: { $gte: sixHoursAgo, $lte: now }
      }),

      // 5a. Overdue Actions Bucket 2: 1 day overdue (6 - 24h overdue)
      Followup.countDocuments({
        owner: req.user._id,
        status: { $in: ['overdue', 'missed'] },
        dueDate: { $gte: twentyFourHoursAgo, $lt: sixHoursAgo }
      }),

      // 5a. Overdue Actions Bucket 3: 2-3 days overdue (24 - 72h overdue)
      Followup.countDocuments({
        owner: req.user._id,
        status: { $in: ['overdue', 'missed'] },
        dueDate: { $gte: seventyTwoHoursAgo, $lt: twentyFourHoursAgo }
      }),

      // 5a. Overdue Actions Bucket 4: 4+ days overdue (>72h overdue)
      Followup.countDocuments({
        owner: req.user._id,
        status: { $in: ['overdue', 'missed'] },
        dueDate: { $lt: seventyTwoHoursAgo }
      }),

      // 3b. Project Deep Dive — Active Leads
      Opportunity.countDocuments({ ...deepDiveMatch, isActive: true }),

      // 3b. Project Deep Dive — Inactive Leads
      Opportunity.countDocuments({
        ...deepDiveMatch,
        $or: [{ intent: 'low' }, { stage: 'lost' }, { isActive: false }]
      }),

      // 3b. Project Deep Dive — Bookings (= Won)
      Opportunity.countDocuments({ ...deepDiveMatch, stage: 'won' }),

      // 3c. Project Deep Dive — Contacted Leads (reached contacted stage or beyond)
      Opportunity.countDocuments({ ...deepDiveMatch, stage: { $ne: 'new' } }),

      // 3b/3c. Project Deep Dive — Site Visits
      SiteVisit.countDocuments({ ...deepDiveScope }),

      // 4a. Best Employee by Won Deals (EXCLUDING Admins, Super Admins, Directors)
      Opportunity.aggregate([
        { $match: { ...scopeFilter, stage: 'won', ...bestDateQuery } },
        { $group: { _id: '$owner', wonCount: { $sum: 1 } } },
        { $sort: { wonCount: -1 } },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        {
          $match: {
            'user.role': { $nin: ['super_admin', 'admin', 'director'] }
          }
        },
        { $limit: 1 },
        {
          $project: {
            _id: 1,
            wonCount: 1,
            name: { $ifNull: ['$user.name', 'Top Sales Rep'] }
          }
        }
      ]),

      // 4a. Best Project by Won Deals
      Opportunity.aggregate([
        { $match: { ...scopeFilter, stage: 'won', ...bestDateQuery } },
        { $group: { _id: '$project', wonCount: { $sum: 1 } } },
        { $sort: { wonCount: -1 } },
        { $limit: 1 },
        {
          $lookup: {
            from: 'projects',
            localField: '_id',
            foreignField: '_id',
            as: 'proj'
          }
        },
        { $unwind: { path: '$proj', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            wonCount: 1,
            name: { $ifNull: ['$proj.name', 'Top Project'] }
          }
        }
      ]),

      // Drill-down lists for Stat Cards
      Opportunity.find({
        ...scopeFilter,
        isActive: true,
        $or: [{ intent: { $in: ['high', 'medium'] } }, { intent: null }, { intent: { $exists: false } }]
      })
        .populate('customer', 'name primaryMobile')
        .populate('project', 'name')
        .populate('owner', 'name')
        .limit(20),

      Opportunity.find({
        ...scopeFilter,
        $or: [{ intent: 'low' }, { stage: 'lost' }, { isActive: false }]
      })
        .populate('customer', 'name primaryMobile')
        .populate('project', 'name')
        .populate('owner', 'name')
        .limit(20),

      Opportunity.find({
        ...scopeFilter,
        isActive: true,
        $or: [{ lastContactedAt: null }, { lastContactedAt: { $exists: false } }]
      })
        .populate('customer', 'name primaryMobile')
        .populate('project', 'name')
        .populate('owner', 'name')
        .limit(20),

      Opportunity.find(scopeFilter)
        .populate('customer', 'name primaryMobile')
        .populate('project', 'name')
        .populate('owner', 'name')
        .sort({ createdAt: -1 })
        .limit(20)
    ]);

    // Shape stage map
    const byStage = {};
    for (const s of stageAgg) {
      byStage[s._id] = s.count;
    }
    const ALL_STAGES = ['new', 'contacted', 'qualified', 'site_visit', 'negotiation', 'nurture', 'won', 'lost'];
    for (const stage of ALL_STAGES) {
      if (byStage[stage] === undefined) byStage[stage] = 0;
    }

    const totalOverdueActions = dueRecent + due1Day + due2To3Days + due4PlusDays;

    const bestEmployee = bestEmployeeAgg.length > 0 ? bestEmployeeAgg[0] : { name: 'No Employee Deals Yet', wonCount: 0 };
    const bestProject = bestProjectAgg.length > 0 ? bestProjectAgg[0] : { name: 'No Project Deals Yet', wonCount: 0 };

    res.json({
      success: true,
      role: req.user.role,
      stats: {
        totalLeads,
        activeLeadsCount,
        inactiveLeadsCount,
        uncontactedLeadsCount,
        wonCount,
        lostCount,
        slaBreachedCount,
        overdueFollowups: totalOverdueActions,
        overdueBuckets: {
          dueRecent,
          due1Day,
          due2To3Days,
          due4PlusDays,
          total: totalOverdueActions
        },
        byStage,
        byProject: projectAgg.map(p => ({
          projectId: p._id,
          projectName: p.projectName,
          count: p.count
        })),
        bySource: sourceAgg.map(s => ({
          source: (s._id || 'DIRECT').toUpperCase(),
          count: s.count
        })),
        projectDeepDive: {
          activeCount: deepActive,
          inactiveCount: deepInactive,
          bookingsCount: deepBookings,
          siteVisitsCount: deepSiteVisits,
          ratios: {
            contactedToVisits: `${deepContacted}:${deepSiteVisits}`,
            contactedToBookings: `${deepContacted}:${deepBookings}`,
            visitsToBookings: `${deepSiteVisits}:${deepBookings}`
          }
        },
        bestPerformers: {
          bestEmployee: {
            name: bestEmployee.name,
            wonCount: bestEmployee.wonCount
          },
          bestProject: {
            name: bestProject.name,
            wonCount: bestProject.wonCount
          },
          preset: bestDateRange
        },
        drillDowns: {
          activeList: drillActiveList,
          inactiveList: drillInactiveList,
          uncontactedList: drillUncontactedList,
          totalList: drillTotalList
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboardStats };
