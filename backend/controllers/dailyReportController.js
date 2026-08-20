const DailyReport = require('../models/DailyReport');
const Activity = require('../models/Activity');
const Followup = require('../models/Followup');
const SiteVisit = require('../models/SiteVisit');
const User = require('../models/User');
const Notification = require('../models/Notification');
const sendAdminAlert = require('../utils/sendAdminAlert');

// @desc    Submit End-of-Day (EOD) report with automatic system activity cross-checking
// @route   POST /api/daily-reports
// @access  Private (all logged-in users)
const submitDailyReport = async (req, res, next) => {
  try {
    const { claimedCalls = 0, claimedFollowups = 0, claimedSiteVisits = 0, notes = '' } = req.body;

    const numCalls = Math.max(0, parseInt(claimedCalls) || 0);
    const numFollowups = Math.max(0, parseInt(claimedFollowups) || 0);
    const numVisits = Math.max(0, parseInt(claimedSiteVisits) || 0);

    // Calculate today's start and end timestamps
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const endOfDay = new Date(now.setHours(23, 59, 59, 999));

    // Independently query REAL logged activities, followups, and site visits created/completed today
    const systemActivityCount = await Activity.countDocuments({
      user: req.user._id,
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    const systemFollowupCount = await Followup.countDocuments({
      assignedTo: req.user._id,
      status: 'completed',
      updatedAt: { $gte: startOfDay, $lte: endOfDay }
    });

    const systemSiteVisitCount = await SiteVisit.countDocuments({
      assignedTo: req.user._id,
      status: 'completed',
      updatedAt: { $gte: startOfDay, $lte: endOfDay }
    });

    // Check discrepancy threshold (e.g. claimed > system * 1.5 + 5)
    let discrepancyFlag = false;
    let discrepancyNote = '';

    const callDiff = numCalls - systemActivityCount;
    const followupDiff = numFollowups - systemFollowupCount;
    const visitDiff = numVisits - systemSiteVisitCount;

    if (
      numCalls > (systemActivityCount * 1.5 + 5) ||
      numFollowups > (systemFollowupCount * 1.5 + 5) ||
      numVisits > (systemSiteVisitCount * 1.5 + 3)
    ) {
      discrepancyFlag = true;
      discrepancyNote = `Claimed ${numCalls} calls (system shows ${systemActivityCount}), ${numFollowups} follow-ups (system shows ${systemFollowupCount}), ${numVisits} visits (system shows ${systemSiteVisitCount}).`;
    }

    // Save or update today's report
    const report = await DailyReport.findOneAndUpdate(
      { user: req.user._id, date: todayStr },
      {
        user: req.user._id,
        date: todayStr,
        claimedCalls: numCalls,
        claimedFollowups: numFollowups,
        claimedSiteVisits: numVisits,
        notes: notes ? notes.trim() : '',
        systemActivityCount,
        systemFollowupCount,
        systemSiteVisitCount,
        discrepancyFlag,
        discrepancyNote
      },
      { upsert: true, returnDocument: 'after', runValidators: true }
    );

    // If discrepancy flag is raised, notify all Admins and Super Admins directly
    if (discrepancyFlag) {
      sendAdminAlert({
        subject: `Daily Report Discrepancy Flagged for ${req.user.name}`,
        message: `${req.user.name}'s daily report on ${todayStr} failed system activity cross-check. ${discrepancyNote}`
      });

      const adminUsers = await User.find({ role: { $in: ['admin', 'super_admin', 'director'] } });
      const notifications = adminUsers.map((admin) => ({
        user: admin._id,
        title: '🚨 EOD Report Discrepancy Flagged',
        message: `${req.user.name} submitted an EOD report with a significant activity discrepancy: ${discrepancyNote}`,
        type: 'sla_breach'
      }));

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
    }

    res.status(201).json({
      success: true,
      message: discrepancyFlag
        ? 'Report saved. Your figures differ from system activity logs — an admin has been notified for review.'
        : 'Daily report submitted successfully!',
      discrepancyFlag,
      report
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user's EOD report for today
// @route   GET /api/daily-reports/today
// @access  Private
const getTodayReport = async (req, res, next) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const report = await DailyReport.findOne({ user: req.user._id, date: todayStr });
    res.json({ success: true, report: report || null });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all flagged EOD reports (Admin view)
// @route   GET /api/admin/daily-reports/flagged
// @access  Private (admin, super_admin, director)
const getFlaggedReports = async (req, res, next) => {
  try {
    const reports = await DailyReport.find({ discrepancyFlag: true })
      .populate('user', 'name email role employeeId')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: reports.length,
      reports
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitDailyReport,
  getTodayReport,
  getFlaggedReports
};
