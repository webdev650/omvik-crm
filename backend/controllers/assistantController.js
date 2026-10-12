const Followup = require('../models/Followup');
const Task = require('../models/Task');
const SiteVisit = require('../models/SiteVisit');
const DailyReport = require('../models/DailyReport');
const Activity = require('../models/Activity');

/**
 * Returns date and time breakdown in Asia/Kolkata timezone (UTC+5:30).
 * Handles all timezone edge cases safely regardless of server timezone.
 */
function getKolkataDateInfo(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    hourCycle: 'h23',
    minute: 'numeric',
    second: 'numeric',
    weekday: 'long'
  }).formatToParts(date);

  const map = {};
  for (const p of parts) map[p.type] = p.value;

  const year = parseInt(map.year, 10);
  const month = parseInt(map.month, 10);
  const day = parseInt(map.day, 10);
  let hour = parseInt(map.hour, 10);
  if (hour === 24) hour = 0;
  const minute = parseInt(map.minute, 10);
  const weekday = map.weekday;

  const yyyy = String(year);
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  // Start & end of calendar day in Kolkata, converted to UTC Date
  const startOfDayUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - (5.5 * 60 * 60 * 1000));
  const endOfDayUtc = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999) - (5.5 * 60 * 60 * 1000));

  return {
    year,
    month,
    day,
    hour,
    minute,
    weekday,
    todayStr,
    startOfDayUtc,
    endOfDayUtc
  };
}

/**
 * Randomly pick a variant from a pool to ensure rotation without repetition.
 */
function pickVariant(variants) {
  if (!variants || variants.length === 0) return '';
  const index = Math.floor(Math.random() * variants.length);
  return variants[index];
}

/**
 * @desc    Get role-based, task-aware Omvik Assistant message
 * @route   GET /api/assistant/message
 * @access  Private (protected)
 */
const getAssistantMessage = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const userRole = user.role || 'telecaller';
    const ADMIN_ROLES = ['admin', 'super_admin', 'director', 'team_lead'];
    const isAdmin = ADMIN_ROLES.includes(userRole);

    const kolkata = getKolkataDateInfo(new Date());
    const { hour, weekday, todayStr, startOfDayUtc, endOfDayUtc } = kolkata;

    // ─────────────────────────────────────────────────────────────────────────────
    // 1. ADMIN LOGIC: Time-based wishes only (Asia/Kolkata time)
    // ─────────────────────────────────────────────────────────────────────────────
    if (isAdmin) {
      const rawName = user.name ? String(user.name).trim() : '';
      const firstName = rawName.split(/\s+/)[0] || 'there';

      // Time-based greetings:
      // 05:00 to 11:59: "Good Morning, {firstName}!"
      // 12:00 to 16:59: "Good Afternoon, {firstName}!"
      // 17:00 to 20:59: "Good Evening, {firstName}!"
      // 21:00 to 04:59: "Good Night, {firstName}!"
      let greeting = '';
      if (hour >= 5 && hour < 12) {
        greeting = `Good Morning, ${firstName}!`;
      } else if (hour >= 12 && hour < 17) {
        greeting = `Good Afternoon, ${firstName}!`;
      } else if (hour >= 17 && hour < 21) {
        greeting = `Good Evening, ${firstName}!`;
      } else {
        greeting = `Good Night, ${firstName}!`;
      }

      // Short extra line by weekday
      const weekdayWishes = {
        Monday: 'Have a great week ahead!',
        Tuesday: 'Have a productive Tuesday!',
        Wednesday: 'Keep up the great momentum this Wednesday!',
        Thursday: 'Have an impactful Thursday!',
        Friday: 'Have a productive Friday!',
        Saturday: 'Have a wonderful and successful weekend!',
        Sunday: 'Have a restful and refreshing Sunday!'
      };
      const extraLine = weekdayWishes[weekday] || 'Have a wonderful day!';
      const adminMessage = `${greeting} ${extraLine}`;

      return res.json({
        type: 'greeting',
        message: adminMessage,
        counts: null
      });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 2. EMPLOYEE LOGIC: Scoped strictly to req.user._id only
    // ─────────────────────────────────────────────────────────────────────────────
    const userId = user._id;
    const now = new Date();

    // Query 1: Overdue follow-ups
    const overdueFollowups = await Followup.countDocuments({
      owner: userId,
      status: { $nin: ['completed', 'cancelled'] },
      $or: [
        { status: { $in: ['overdue', 'missed'] } },
        { status: 'scheduled', dueAt: { $lt: now } }
      ]
    });

    // Query 2: Follow-ups due today (not yet completed, not past due)
    const followupsDueToday = await Followup.countDocuments({
      owner: userId,
      status: 'scheduled',
      dueAt: { $gte: now, $lte: endOfDayUtc }
    });

    // Query 3: Pending tasks from the Task model
    const pendingTasks = await Task.countDocuments({
      owner: userId,
      status: 'pending'
    });

    // Query 4: Site visits scheduled today that are not completed
    const pendingVisitsToday = await SiteVisit.find({
      $or: [{ owner: userId }, { scheduledBy: userId }],
      scheduledAt: { $gte: startOfDayUtc, $lte: endOfDayUtc },
      status: { $in: ['planned', 'confirmed'] }
    }).sort({ scheduledAt: 1 });

    const pendingVisitsCount = pendingVisitsToday.length;

    // Query 5: EOD report status for today
    const todayReport = await DailyReport.findOne({
      user: userId,
      date: todayStr
    });
    const isEodSubmitted = !!todayReport;

    // Query 6: Check if user had tasks/work that was completed today
    // (Used to distinguish actual completion from "No tasks assigned at all")
    const [
      completedTasksCount,
      completedFollowupsCount,
      completedVisitsCount,
      activitiesTodayCount
    ] = await Promise.all([
      Task.countDocuments({
        owner: userId,
        status: 'completed',
        updatedAt: { $gte: startOfDayUtc, $lte: endOfDayUtc }
      }),
      Followup.countDocuments({
        owner: userId,
        status: 'completed',
        updatedAt: { $gte: startOfDayUtc, $lte: endOfDayUtc }
      }),
      SiteVisit.countDocuments({
        $or: [{ owner: userId }, { scheduledBy: userId }],
        status: 'completed',
        updatedAt: { $gte: startOfDayUtc, $lte: endOfDayUtc }
      }),
      Activity.countDocuments({
        user: userId,
        createdAt: { $gte: startOfDayUtc, $lte: endOfDayUtc }
      })
    ]);

    const hasCompletedWorkToday = (
      completedTasksCount > 0 ||
      completedFollowupsCount > 0 ||
      completedVisitsCount > 0 ||
      activitiesTodayCount > 0 ||
      isEodSubmitted
    );

    const counts = {
      overdueFollowups,
      followupsDueToday,
      pendingTasks,
      pendingSiteVisits: pendingVisitsCount,
      isEodSubmitted
    };

    let messageType = 'info';
    let selectedMessage = '';

    // ── PICK ONE MESSAGE BY PRIORITY ──────────────────────────────────────────

    // Priority a) Overdue follow-ups > 0: reminder with the real count
    if (overdueFollowups > 0) {
      messageType = 'reminder';
      const count = overdueFollowups;
      const s = count > 1 ? 's' : '';
      const overdueVariants = [
        `You have ${count} overdue follow-up${s}. Please call them first.`,
        `Action needed: ${count} follow-up${count > 1 ? 's are' : ' is'} overdue. Please connect with them first.`,
        `Don't let leads go cold! You have ${count} overdue follow-up${s} waiting for action.`,
        `Gentle reminder: ${count} follow-up${count > 1 ? 's require' : ' requires'} attention. Let's reach out to them first.`
      ];
      selectedMessage = pickVariant(overdueVariants);
    }
    // Priority b) Pending tasks or follow-ups due today > 0: reminder with the count
    else if (pendingTasks > 0 || followupsDueToday > 0) {
      messageType = 'reminder';
      if (followupsDueToday > 0 && pendingTasks > 0) {
        const fs = followupsDueToday > 1 ? 's' : '';
        const ts = pendingTasks > 1 ? 's' : '';
        const combinedVariants = [
          `You have ${followupsDueToday} follow-up${fs} due today and ${pendingTasks} pending task${ts}. You're on track, keep going!`,
          `${followupsDueToday} follow-up${fs} and ${pendingTasks} task${ts} are scheduled for today. Keep up the great pace!`,
          `Today's priorities: ${followupsDueToday} follow-up${fs} and ${pendingTasks} task${ts} to complete. Stay focused!`,
          `Ready for action? You have ${followupsDueToday} follow-up${fs} and ${pendingTasks} pending task${ts} today. Keep the momentum going!`
        ];
        selectedMessage = pickVariant(combinedVariants);
      } else if (followupsDueToday > 0) {
        const s = followupsDueToday > 1 ? 's' : '';
        const followupsVariants = [
          `${followupsDueToday} follow-up${followupsDueToday > 1 ? 's are' : ' is'} due today. You're on track, keep going.`,
          `You have ${followupsDueToday} follow-up${s} scheduled for today. Have great conversations with your leads!`,
          `Stay ahead of your pipeline: ${followupsDueToday} follow-up${s} due today.`,
          `Focus on your leads: ${followupsDueToday} follow-up${s} to complete today. Keep it up!`
        ];
        selectedMessage = pickVariant(followupsVariants);
      } else {
        const s = pendingTasks > 1 ? 's' : '';
        const tasksVariants = [
          `You have ${pendingTasks} pending task${s} today. You're on track, keep going.`,
          `${pendingTasks} task${pendingTasks > 1 ? 's are' : ' is'} waiting for you today. Let's get them completed!`,
          `Stay productive: ${pendingTasks} pending task${s} on your list today. Keep up the momentum!`,
          `Keep pushing forward! You have ${pendingTasks} task${s} to finish today.`
        ];
        selectedMessage = pickVariant(tasksVariants);
      }
    }
    // Priority c) Site visit today not completed
    else if (pendingVisitsCount > 0) {
      messageType = 'reminder';
      const earliestVisit = pendingVisitsToday[0];
      const timeStr = earliestVisit.scheduledAt
        ? new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Kolkata',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          }).format(new Date(earliestVisit.scheduledAt))
        : 'today';

      const siteVisitVariants = [
        `You have a site visit at ${timeStr}. Be ready.`,
        `Upcoming site visit today at ${timeStr}. Best of luck with the client!`,
        `Reminder: Site visit scheduled for ${timeStr} today. Be prepared and on time.`,
        `Client meeting ahead: You have a site visit today at ${timeStr}. Make it a success!`
      ];
      selectedMessage = pickVariant(siteVisitVariants);
    }
    // Priority d) Everything complete but EOD pending (only after 5 PM / hour >= 17)
    else if (hour >= 17 && !isEodSubmitted && hasCompletedWorkToday) {
      messageType = 'reminder';
      const eodPendingVariants = [
        'All tasks done. Please submit your EOD report.',
        'Great work on completing your tasks today! Please submit your EOD report.',
        'Everything is on track! Don\'t forget to submit your EOD report before wrapping up.',
        'Your daily tasks are complete. Please take a moment to submit your EOD report.'
      ];
      selectedMessage = pickVariant(eodPendingVariants);
    }
    // Priority e) ALL done: appreciation (no overdue, no pending tasks, no due follow-ups, no pending visits, EOD submitted if after 5 PM)
    else if (hasCompletedWorkToday && (hour < 17 || isEodSubmitted)) {
      messageType = 'appreciation';
      const appreciationVariants = [
        'Great work today! All your tasks are completed.',
        'Outstanding job today! Everything has been completed successfully.',
        'Fantastic effort! All your tasks, visits, and follow-ups are done for today.',
        'Superb execution today! Your task list is completely cleared. Enjoy your evening!'
      ];
      selectedMessage = pickVariant(appreciationVariants);
    }
    // Priority f) No tasks assigned at all: neutral message, not praise
    else {
      messageType = 'info';
      const noTasksVariants = [
        'No tasks assigned yet. Check your leads and start calling.',
        'Your task queue is clear. Explore open leads in your pipeline to get started.',
        'No pending tasks right now. Review your contact list and connect with prospects.',
        'All quiet on tasks. Reach out to new leads to build your pipeline today.'
      ];
      selectedMessage = pickVariant(noTasksVariants);
    }

    return res.json({
      type: messageType,
      message: selectedMessage,
      counts
    });
  } catch (error) {
    console.error('[Omvik Assistant] Error computing assistant message:', error);
    // Safe fallback message, never crash
    const isAdminFallback = req.user?.role && ['admin', 'super_admin', 'director', 'team_lead'].includes(req.user.role);
    return res.json({
      type: isAdminFallback ? 'greeting' : 'info',
      message: isAdminFallback
        ? 'Welcome to OMVIK CRM. Have a productive day!'
        : 'Check your leads and tasks to stay on track today.',
      counts: null
    });
  }
};

module.exports = {
  getAssistantMessage,
  getKolkataDateInfo,
  pickVariant
};
