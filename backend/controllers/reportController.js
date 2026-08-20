const Opportunity = require('../models/Opportunity');
const Followup = require('../models/Followup');
const Activity = require('../models/Activity');
const SiteVisit = require('../models/SiteVisit');
const DailyReport = require('../models/DailyReport');
const User = require('../models/User');

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

module.exports = {
  getMyPerformance,
  getEmployeeHistory
};
