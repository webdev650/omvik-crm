const Opportunity = require('../models/Opportunity');
const Followup = require('../models/Followup');
const Activity = require('../models/Activity');
const SiteVisit = require('../models/SiteVisit');
const DailyReport = require('../models/DailyReport');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Project = require('../models/Project');

// @desc    Get self performance metrics for logged-in user (accessible to all roles)
// @route   GET /api/reports/me
// @access  Private (all logged-in users)
const getMyPerformance = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const [
      leadsOwned,
      activitiesLogged,
      followupsCompleted,
      followupsOverdue,
      siteVisitsCompleted,
      opportunitiesWon
    ] = await Promise.all([
      Opportunity.countDocuments({ owner: userId }),
      Activity.countDocuments({ user: userId }),
      Followup.countDocuments({ assignedTo: userId, status: 'completed' }),
      Followup.countDocuments({ assignedTo: userId, status: { $in: ['overdue', 'missed'] } }),
      SiteVisit.countDocuments({ assignedTo: userId, status: 'completed' }),
      Opportunity.countDocuments({ owner: userId, stage: 'won' })
    ]);

    const winRate = leadsOwned > 0 ? Math.round((opportunitiesWon / leadsOwned) * 100) : 0;

    res.json({
      success: true,
      performance: {
        userId,
        userName: req.user.name,
        userRole: req.user.role,
        employeeId: req.user.employeeId,
        leadsOwned,
        activitiesLogged,
        followupsCompleted,
        followupsOverdue,
        siteVisitsCompleted,
        opportunitiesWon,
        winRate
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get date-filtered activity & performance history for a specific employee
// @route   GET /api/reports/employee-history/:userId
// @access  Private (admin, super_admin, director, team_lead - team_lead restricted to their own team)
const getEmployeeHistory = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        message: 'Both "from" and "to" date parameters (ISO / YYYY-MM-DD) are required for history analysis.'
      });
    }

    const targetUser = await User.findById(userId).populate('teamId', 'name description');
    if (!targetUser) {
      return res.status(404).json({ message: 'Employee user not found' });
    }

    // Team Lead RBAC Restriction Check: Only allow viewing members of their own team
    if (req.user.role === 'team_lead') {
      const viewerTeamId = req.user.teamId?.toString();
      const targetTeamId = targetUser.teamId?._id?.toString() || targetUser.teamId?.toString();

      if (req.user._id.toString() !== userId && (!viewerTeamId || viewerTeamId !== targetTeamId)) {
        return res.status(403).json({
          message: 'Forbidden: Team leads can only view performance history for members of their own assigned team.'
        });
      }
    }

    // Parse date window boundaries
    const startDate = new Date(from);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(to);
    endDate.setHours(23, 59, 59, 999);

    const fromDateStr = from.split('T')[0];
    const toDateStr = to.split('T')[0];

    // Execute parallel aggregations for the date window
    const [
      newLeadsInPeriod,
      totalOwnedInPeriod,
      activitiesList,
      followupsCompleted,
      followupsOverdue,
      siteVisitsCompleted,
      dealsWon,
      dealsLost,
      slaBreaches,
      dailyReportsList
    ] = await Promise.all([
      Opportunity.countDocuments({ owner: userId, createdAt: { $gte: startDate, $lte: endDate } }),
      Opportunity.countDocuments({ owner: userId, createdAt: { $lte: endDate } }),
      Activity.find({ user: userId, createdAt: { $gte: startDate, $lte: endDate } }),
      Followup.countDocuments({ assignedTo: userId, status: 'completed', updatedAt: { $gte: startDate, $lte: endDate } }),
      Followup.countDocuments({ assignedTo: userId, status: { $in: ['overdue', 'missed'] }, createdAt: { $gte: startDate, $lte: endDate } }),
      SiteVisit.countDocuments({ assignedTo: userId, status: 'completed', updatedAt: { $gte: startDate, $lte: endDate } }),
      Opportunity.countDocuments({ owner: userId, stage: 'won', updatedAt: { $gte: startDate, $lte: endDate } }),
      Opportunity.countDocuments({ owner: userId, stage: 'lost', updatedAt: { $gte: startDate, $lte: endDate } }),
      Opportunity.countDocuments({ owner: userId, slaBreached: true, updatedAt: { $gte: startDate, $lte: endDate } }),
      DailyReport.find({ user: userId, date: { $gte: fromDateStr, $lte: toDateStr } }).sort({ date: -1 })
    ]);

    // Outcome breakdown
    const activityOutcomeBreakdown = {
      connected: 0,
      no_answer: 0,
      busy: 0,
      switched_off: 0,
      wrong_number: 0,
      interested: 0,
      not_interested: 0
    };

    activitiesList.forEach((act) => {
      if (act.outcome && activityOutcomeBreakdown[act.outcome] !== undefined) {
        activityOutcomeBreakdown[act.outcome]++;
      }
    });

    res.json({
      success: true,
      employee: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        employeeId: targetUser.employeeId,
        teamName: targetUser.teamId?.name || 'Unassigned'
      },
      range: {
        from: fromDateStr,
        to: toDateStr,
        startDate,
        endDate
      },
      summary: {
        newLeadsInPeriod,
        totalOwnedInPeriod,
        activitiesCount: activitiesList.length,
        activityOutcomeBreakdown,
        followupsCompleted,
        followupsOverdue,
        siteVisitsCompleted,
        dealsWon,
        dealsLost,
        slaBreaches
      },
      dailyReports: dailyReportsList
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper to compute date range window based on period string or custom dates
 */
function getDateWindow(period = 'this_month', from, to) {
  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);

  if (period === 'today') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (period === 'yesterday') {
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 59, 999);
  } else if (period === 'this_week') {
    const day = start.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    start.setDate(start.getDate() + diff);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (period === 'last_week') {
    const day = start.getDay();
    const diffToThisMonday = (day === 0 ? -6 : 1) - day;
    const lastMonday = new Date(start);
    lastMonday.setDate(start.getDate() + diffToThisMonday - 7);
    lastMonday.setHours(0, 0, 0, 0);
    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastMonday.getDate() + 6);
    lastSunday.setHours(23, 59, 59, 999);
    start = lastMonday;
    end = lastSunday;
  } else if (period === 'this_month') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (period === 'last_month') {
    start.setMonth(start.getMonth() - 1);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setDate(0);
    end.setHours(23, 59, 59, 999);
  } else if (period === 'this_quarter') {
    const currentMonth = start.getMonth();
    const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
    start.setMonth(quarterStartMonth, 1);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (period === 'custom' || from || to) {
    if (from) {
      start = new Date(from);
      start.setHours(0, 0, 0, 0);
    }
    if (to) {
      end = new Date(to);
      end.setHours(23, 59, 59, 999);
    }
  } else {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  }

  return { start, end };
}

// @desc    Get 21 Executive Dashboard KPIs for main management view
// @route   GET /api/reports/executive-kpis
// @access  Private (super_admin, director, admin, team_lead)
const getExecutiveKpis = async (req, res, next) => {
  try {
    const { period = 'this_month', from, to } = req.query;

    const { start, end } = getDateWindow(period, from, to);

    // Today range strictly for "Follow-ups Due Today"
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Execute queries concurrently
    const [
      totalLeads,
      activeLeads,
      hotLeads,
      followupsDueToday,
      overdueFollowups,
      siteVisitsScheduled,
      siteVisitsCompleted,
      negotiations,
      bookingsCount,
      lostLeads,
      bookingValueAgg,
      salesPipelineValueAgg,
      oppsInPeriod,
      followupsDueInPeriod,
      followupsCompletedInPeriod,
      teamAgg,
      projectAgg,
      sourceAgg
    ] = await Promise.all([
      // 1 & 2: Total Leads & New Leads created in period
      Opportunity.countDocuments({ createdAt: { $gte: start, $lte: end } }),

      // 3: Active Leads (current snapshot)
      Opportunity.countDocuments({ isActive: true }),

      // 4: Hot Leads (intent = high AND isActive = true, current snapshot)
      Opportunity.countDocuments({ intent: 'high', isActive: true }),

      // 5: Follow-ups Due Today (always today, status = scheduled)
      Followup.countDocuments({ dueAt: { $gte: todayStart, $lte: todayEnd }, status: 'scheduled' }),

      // 6: Overdue Follow-ups (status = overdue, current snapshot)
      Followup.countDocuments({ status: 'overdue' }),

      // 7: Site Visits Scheduled in period (status in planned, confirmed)
      SiteVisit.countDocuments({
        status: { $in: ['planned', 'confirmed'] },
        $or: [{ scheduledAt: { $gte: start, $lte: end } }, { createdAt: { $gte: start, $lte: end } }]
      }),

      // 8: Site Visits Completed in period
      SiteVisit.countDocuments({
        status: 'completed',
        $or: [{ scheduledAt: { $gte: start, $lte: end } }, { updatedAt: { $gte: start, $lte: end } }]
      }),

      // 9: Negotiations (stage = negotiation AND isActive = true, current snapshot)
      Opportunity.countDocuments({ stage: 'negotiation', isActive: true }),

      // 10: Bookings created in period
      Booking.countDocuments({
        $or: [{ bookingDate: { $gte: start, $lte: end } }, { createdAt: { $gte: start, $lte: end } }]
      }),

      // 11: Lost Leads moved to lost in period
      Opportunity.countDocuments({
        stage: 'lost',
        $or: [{ closedAt: { $gte: start, $lte: end } }, { updatedAt: { $gte: start, $lte: end } }]
      }),

      // 14: Booking Value aggregate
      Booking.aggregate([
        { $match: { $or: [{ bookingDate: { $gte: start, $lte: end } }, { createdAt: { $gte: start, $lte: end } }] } },
        { $group: { _id: null, totalValue: { $sum: '$finalPrice' } } }
      ]),

      // 16: Sales Pipeline Value aggregate (isActive = true, stage not in won/lost, current snapshot)
      Opportunity.aggregate([
        { $match: { isActive: true, stage: { $nin: ['won', 'lost'] } } },
        { $group: { _id: null, totalValue: { $sum: '$estimatedValue' } } }
      ]),

      // 17: Opportunities created in period (to check Activity presence)
      Opportunity.find({ createdAt: { $gte: start, $lte: end } }).select('_id').lean(),

      // 18: Followups with dueAt in period
      Followup.countDocuments({ dueAt: { $gte: start, $lte: end } }),
      Followup.countDocuments({ status: 'completed', dueAt: { $gte: start, $lte: end } }),

      // 19: Sales Team Performance aggregation (top 3)
      Booking.aggregate([
        { $match: { $or: [{ bookingDate: { $gte: start, $lte: end } }, { createdAt: { $gte: start, $lte: end } }] } },
        { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 3 }
      ]),

      // 20: Project Performance aggregation (top 3)
      Booking.aggregate([
        { $match: { $or: [{ bookingDate: { $gte: start, $lte: end } }, { createdAt: { $gte: start, $lte: end } }] } },
        { $group: { _id: '$project', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 3 }
      ]),

      // 21: Source Performance aggregation (top 3)
      Booking.aggregate([
        { $match: { $or: [{ bookingDate: { $gte: start, $lte: end } }, { createdAt: { $gte: start, $lte: end } }] } },
        {
          $lookup: {
            from: 'opportunities',
            localField: 'opportunity',
            foreignField: '_id',
            as: 'opp'
          }
        },
        { $unwind: { path: '$opp', preserveNullAndEmptyArrays: true } },
        { $group: { _id: '$opp.source', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 3 }
      ])
    ]);

    // Derived values & safe calculations
    const newLeads = totalLeads;
    const conversionRate = totalLeads > 0 ? Number(((bookingsCount / totalLeads) * 100).toFixed(2)) : 0;
    const siteVisitConversion = siteVisitsCompleted > 0 ? Number(((bookingsCount / siteVisitsCompleted) * 100).toFixed(2)) : 0;
    const bookingValue = bookingValueAgg[0]?.totalValue || 0;
    const averageDealValue = bookingsCount > 0 ? Number((bookingValue / bookingsCount).toFixed(2)) : 0;
    const salesPipelineValue = salesPipelineValueAgg[0]?.totalValue || 0;

    // Item 17: Lead Response Rate
    let leadsResponded = 0;
    if (oppsInPeriod.length > 0) {
      const oppIds = oppsInPeriod.map((o) => o._id);
      const distinctResponded = await Activity.distinct('opportunity', { opportunity: { $in: oppIds } });
      leadsResponded = distinctResponded.length;
    }
    const leadResponseRate = totalLeads > 0 ? Number(((leadsResponded / totalLeads) * 100).toFixed(2)) : 0;

    // Item 18: Follow-up Compliance
    const followupCompliance = followupsDueInPeriod > 0 ? Number(((followupsCompletedInPeriod / followupsDueInPeriod) * 100).toFixed(2)) : 0;

    // Item 19: Top 3 Sales Team Executives
    const userIds = teamAgg.map((t) => t._id).filter(Boolean);
    const users = await User.find({ _id: { $in: userIds } }).select('name email role').lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u.name]));

    const salesTeamPerformance = teamAgg.map((t) => ({
      userId: t._id ? t._id.toString() : 'unassigned',
      name: t._id ? userMap.get(t._id.toString()) || 'Unassigned Executive' : 'Unassigned Executive',
      count: t.count
    }));

    // Item 20: Top 3 Projects
    const projectIds = projectAgg.map((p) => p._id).filter(Boolean);
    const projects = await Project.find({ _id: { $in: projectIds } }).select('name').lean();
    const projectMap = new Map(projects.map((p) => [p._id.toString(), p.name]));

    const projectPerformance = projectAgg.map((p) => ({
      projectId: p._id ? p._id.toString() : 'unassigned',
      name: p._id ? projectMap.get(p._id.toString()) || 'Unassigned Project' : 'Unassigned Project',
      count: p.count
    }));

    // Item 21: Top 3 Sources
    const sourcePerformance = sourceAgg.map((s) => ({
      source: s._id || 'DIRECT',
      name: (s._id || 'DIRECT').replace('_', ' ').toUpperCase(),
      count: s.count
    }));

    res.json({
      success: true,
      period,
      range: { start, end },
      kpis: {
        totalLeads, // 1
        newLeads, // 2
        activeLeads, // 3 (snapshot)
        hotLeads, // 4 (snapshot)
        followupsDueToday, // 5 (today-only)
        overdueFollowups, // 6 (snapshot)
        siteVisitsScheduled, // 7
        siteVisitsCompleted, // 8
        negotiations, // 9 (snapshot)
        bookings: bookingsCount, // 10
        lostLeads, // 11
        conversionRate, // 12
        siteVisitConversion, // 13
        bookingValue, // 14
        averageDealValue, // 15
        salesPipelineValue, // 16 (snapshot)
        leadResponseRate, // 17
        followupCompliance, // 18
        salesTeamPerformance, // 19
        projectPerformance, // 20
        sourcePerformance // 21
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyPerformance,
  getEmployeeHistory,
  getExecutiveKpis
};
