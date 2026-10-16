const DailyReport = require('../models/DailyReport');
const Activity = require('../models/Activity');
const Followup = require('../models/Followup');
const SiteVisit = require('../models/SiteVisit');
const Opportunity = require('../models/Opportunity');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Leave = require('../models/Leave');
const Notification = require('../models/Notification');
const sendAdminAlert = require('../utils/sendAdminAlert');

// @desc    Submit End-of-Day (EOD) report with automatic system activity cross-checking
// @route   POST /api/daily-reports
// @access  Private (all logged-in users)
const submitDailyReport = async (req, res, next) => {
  try {
    const {
      claimedCalls = 0,
      whatsappMessages = 0,
      connectedCalls = 0,
      claimedFollowups = 0,
      claimedSiteVisits = 0,
      bookingsToday = 0,
      notes = ''
    } = req.body;

    const numCalls = Math.max(0, parseInt(claimedCalls) || 0);
    const numWhatsapp = Math.max(0, parseInt(whatsappMessages) || 0);
    const numConnected = Math.max(0, parseInt(connectedCalls) || 0);
    const numFollowups = Math.max(0, parseInt(claimedFollowups) || 0);
    const numVisits = Math.max(0, parseInt(claimedSiteVisits) || 0);
    const numBookings = Math.max(0, parseInt(bookingsToday) || 0);

    // Auto-compute leadsAssigned server-side (read-only active leads assigned to user)
    const leadsAssigned = await Opportunity.countDocuments({ owner: req.user._id, isActive: true });

    // Calculate today's start and end timestamps
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const endOfDay = new Date(now.setHours(23, 59, 59, 999));

    // Independently query REAL logged activities, followups, site visits, and bookings created today
    const systemActivityCount = await Activity.countDocuments({
      user: req.user._id,
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    const systemWhatsappCount = await Activity.countDocuments({
      user: req.user._id,
      channel: 'whatsapp',
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    const systemConnectedCallsCount = await Activity.countDocuments({
      user: req.user._id,
      channel: 'call',
      outcome: 'connected',
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

    const userOppIds = await Opportunity.find({ owner: req.user._id }).distinct('_id');
    const systemBookingsCount = await Booking.countDocuments({
      $or: [
        { opportunity: { $in: userOppIds } },
        { assignedTo: req.user._id },
        { createdBy: req.user._id }
      ],
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    // Check discrepancy threshold across all metrics
    let discrepancyFlag = false;
    const discrepancyParts = [];

    if (numCalls > (systemActivityCount * 1.5 + 5)) {
      discrepancyFlag = true;
      discrepancyParts.push(`Calls: claimed ${numCalls} vs ${systemActivityCount} logged`);
    }

    if (numWhatsapp > (systemWhatsappCount * 1.5 + 5)) {
      discrepancyFlag = true;
      discrepancyParts.push(`WhatsApp: claimed ${numWhatsapp} vs ${systemWhatsappCount} logged`);
    }

    if (numConnected > (systemConnectedCallsCount * 1.5 + 5)) {
      discrepancyFlag = true;
      discrepancyParts.push(`Connected Calls: claimed ${numConnected} vs ${systemConnectedCallsCount} logged`);
    }

    if (numFollowups > (systemFollowupCount * 1.5 + 5)) {
      discrepancyFlag = true;
      discrepancyParts.push(`Follow-ups: claimed ${numFollowups} vs ${systemFollowupCount} logged`);
    }

    if (numVisits > (systemSiteVisitCount * 1.5 + 3)) {
      discrepancyFlag = true;
      discrepancyParts.push(`Visits: claimed ${numVisits} vs ${systemSiteVisitCount} logged`);
    }

    if (numBookings > (systemBookingsCount + 2)) {
      discrepancyFlag = true;
      discrepancyParts.push(`Bookings: claimed ${numBookings} vs ${systemBookingsCount} logged`);
    }

    const discrepancyNote = discrepancyFlag ? discrepancyParts.join('; ') : '';

    // Save or update today's report
    const report = await DailyReport.findOneAndUpdate(
      { user: req.user._id, date: todayStr },
      {
        user: req.user._id,
        date: todayStr,
        claimedCalls: numCalls,
        whatsappMessages: numWhatsapp,
        connectedCalls: numConnected,
        claimedFollowups: numFollowups,
        claimedSiteVisits: numVisits,
        bookingsToday: numBookings,
        leadsAssigned,
        notes: notes ? notes.trim() : '',
        systemActivityCount,
        systemWhatsappCount,
        systemConnectedCallsCount,
        systemFollowupCount,
        systemSiteVisitCount,
        systemBookingsCount,
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
      message: 'Daily report submitted successfully!',
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
    const leadsAssigned = await Opportunity.countDocuments({ owner: req.user._id, isActive: true });

    res.json({
      success: true,
      report: report || null,
      leadsAssigned
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all flagged EOD reports (Admin view with date range & status filters)
// @route   GET /api/daily-reports/flagged
// @access  Private (admin, super_admin, director, team_lead)
const getFlaggedReports = async (req, res, next) => {
  try {
    const { status, fromDate, toDate, date } = req.query;
    const filter = { discrepancyFlag: true };

    if (date) {
      filter.date = date.toString().trim();
    } else if (fromDate || toDate) {
      filter.date = {};
      if (fromDate) filter.date.$gte = fromDate.toString().trim();
      if (toDate) filter.date.$lte = toDate.toString().trim();
    }

    if (status && status !== 'all') {
      filter.resolutionStatus = status.toString().trim();
    }

    const reports = await DailyReport.find(filter)
      .populate('user', 'name email role employeeId')
      .populate('resolvedBy', 'name email role')
      .sort({ date: -1, createdAt: -1 });

    res.json({
      success: true,
      count: reports.length,
      reports
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resolve, review, or add notes to a flagged EOD report
// @route   PATCH /api/daily-reports/:id/resolve
// @access  Private (admin, super_admin, director, team_lead)
const resolveFlaggedReport = async (req, res, next) => {
  try {
    const { status = 'resolved', resolutionNotes = '' } = req.body;
    const report = await DailyReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Daily report not found' });
    }

    if (['open', 'reviewed', 'resolved'].includes(status)) {
      report.resolutionStatus = status;
    }
    report.resolvedAt = new Date();
    report.resolvedBy = req.user._id;
    if (resolutionNotes !== undefined) {
      report.resolutionNotes = resolutionNotes.trim();
    }

    await report.save();

    const populated = await DailyReport.findById(report._id)
      .populate('user', 'name email role employeeId')
      .populate('resolvedBy', 'name email role');

    res.json({
      success: true,
      message: `Report marked as ${report.resolutionStatus}`,
      report: populated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get full team EOD overview for a selected date
// @route   GET /api/daily-reports/team-overview
// @access  Private (admin, super_admin, director, team_lead)
const getTeamOverview = async (req, res, next) => {
  try {
    const targetDate = req.query.date ? req.query.date.toString().trim() : new Date().toISOString().split('T')[0];

    // Compute start and end timestamp boundaries for targetDate (UTC and local)
    const [y, m, d] = targetDate.split('-').map(Number);
    const startOfDayUTC = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
    const endOfDayUTC = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
    const startOfDayLocal = new Date(y, m - 1, d, 0, 0, 0, 0);
    const endOfDayLocal = new Date(y, m - 1, d, 23, 59, 59, 999);
    const dateStart = startOfDayUTC < startOfDayLocal ? startOfDayUTC : startOfDayLocal;
    const dateEnd = endOfDayUTC > endOfDayLocal ? endOfDayUTC : endOfDayLocal;

    // Fetch all active employees
    const activeEmployees = await User.find({ isActive: true })
      .select('name email role employeeId')
      .sort({ name: 1 });

    const overviewList = await Promise.all(
      activeEmployees.map(async (emp) => {
        const report = await DailyReport.findOne({ user: emp._id, date: targetDate });
        const currentLeadsAssigned = await Opportunity.countDocuments({ owner: emp._id, isActive: true });
        
        // EOD daily activity report submission is strictly required for telecallers/sales reps
        const isExempt = ['super_admin', 'admin', 'director'].includes(emp.role);
        const isRequiredSubmitter = !isExempt && ['telecaller', 'team_lead', 'field_executive'].includes(emp.role);

        // Check if employee has an approved leave on this date
        const approvedLeave = await Leave.findOne({
          user: emp._id,
          status: 'approved',
          startDate: { $lte: dateEnd },
          endDate: { $gte: dateStart }
        });
        const isOnLeave = !!approvedLeave;

        // Real activities/calls logged in CRM for this employee on this date
        const realCallsCount = await Activity.countDocuments({
          user: emp._id,
          createdAt: { $gte: dateStart, $lte: dateEnd }
        });

        const realConnectedCallsCount = await Activity.countDocuments({
          user: emp._id,
          channel: 'call',
          outcome: 'connected',
          createdAt: { $gte: dateStart, $lte: dateEnd }
        });

        // Canonical status:
        let status = 'Pending';
        if (report) {
          status = report.discrepancyFlag ? 'Flagged' : 'Submitted';
        } else if (isExempt) {
          status = 'Exempt';
        } else if (isOnLeave) {
          status = 'On leave';
        } else {
          status = 'Pending';
        }

        return {
          user: emp,
          submitted: !!report,
          isRequiredSubmitter,
          isExempt,
          isOnLeave,
          status,
          report: report || null,
          currentLeadsAssigned,
          realCallsCount,
          realConnectedCallsCount
        };
      })
    );

    // Grouping counts - all derived from the SAME overviewList
    const totalCount = overviewList.length;
    const submittedCount = overviewList.filter((item) => item.submitted).length;
    const pendingCount = overviewList.filter((item) => !item.submitted && !item.isExempt && !item.isOnLeave).length;
    const discrepantCount = overviewList.filter((item) => item.report?.discrepancyFlag).length;
    const exemptCount = overviewList.filter((item) => item.isExempt).length;
    const onLeaveCount = overviewList.filter((item) => item.isOnLeave).length;

    // Sort: NOT-YET-SUBMITTED telecallers appear FIRST, then submitted/exempt, then alphabetically by name
    overviewList.sort((a, b) => {
      const aPending = a.status === 'Pending';
      const bPending = b.status === 'Pending';
      if (aPending !== bPending) {
        return aPending ? -1 : 1;
      }
      if (a.submitted !== b.submitted) {
        return a.submitted ? 1 : -1;
      }
      return a.user.name.localeCompare(b.user.name);
    });

    res.json({
      success: true,
      date: targetDate,
      count: totalCount,
      totalCount,
      requiredCount: overviewList.filter((i) => i.isRequiredSubmitter).length,
      submittedCount,
      pendingCount,
      discrepantCount,
      flaggedCount: discrepantCount,
      exemptCount,
      onLeaveCount,
      overview: overviewList
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitDailyReport,
  getTodayReport,
  getFlaggedReports,
  resolveFlaggedReport,
  getTeamOverview
};

