const Followup = require('../models/Followup');
const Task = require('../models/Task');
const SiteVisit = require('../models/SiteVisit');
const DailyReport = require('../models/DailyReport');
const Activity = require('../models/Activity');

// In-memory map to guarantee rotation without repeating the same line consecutively
const lastVariantIndices = new Map();

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
 * Pick a variant from a pool and rotate to avoid repeating the same line consecutively.
 */
function pickRotatingVariant(key, variants) {
  if (!variants || variants.length === 0) return '';
  if (variants.length === 1) return variants[0];

  const lastIndex = lastVariantIndices.get(key);
  let nextIndex = Math.floor(Math.random() * variants.length);

  // If identical to last picked index, shift by 1 to guarantee rotation
  if (lastIndex !== undefined && nextIndex === lastIndex) {
    nextIndex = (lastIndex + 1) % variants.length;
  }

  lastVariantIndices.set(key, nextIndex);

  // Prevent memory growth over time
  if (lastVariantIndices.size > 5000) {
    lastVariantIndices.clear();
  }

  return variants[nextIndex];
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

    // Support simulated time/hour for automated testing & verification
    let kolkata = getKolkataDateInfo(new Date());
    if (req.query?.simulateTime || req.headers?.['x-simulate-time']) {
      const simDate = new Date(req.query?.simulateTime || req.headers?.['x-simulate-time']);
      if (!isNaN(simDate.getTime())) {
        kolkata = getKolkataDateInfo(simDate);
      }
    }
    if (req.query?.simulateHour !== undefined) {
      const parsedHour = parseInt(req.query.simulateHour, 10);
      if (!isNaN(parsedHour)) {
        kolkata.hour = parsedHour;
      }
    }

    const { hour, weekday, todayStr, startOfDayUtc, endOfDayUtc } = kolkata;
    const userId = user._id;

    // ─────────────────────────────────────────────────────────────────────────────
    // 1. ADMIN LOGIC: Time-based wishes only (Asia/Kolkata time)
    // ─────────────────────────────────────────────────────────────────────────────
    if (isAdmin) {
      const rawName = user.firstName || (user.name ? String(user.name).trim().split(/\s+/)[0] : '');
      const firstName = rawName || 'there';
      const namePart = rawName ? `, ${rawName}` : '';

      // Time-based greetings:
      // 05:00 to 11:59: "Good Morning, {firstName}!"
      // 12:00 to 16:59: "Good Afternoon, {firstName}!"
      // 17:00 to 20:59: "Good Evening, {firstName}!"
      // 21:00 to 04:59: "Good Night, {firstName}!"
      let greeting = '';
      if (hour >= 5 && hour < 12) {
        greeting = `Good Morning${namePart}!`;
      } else if (hour >= 12 && hour < 17) {
        greeting = `Good Afternoon${namePart}!`;
      } else if (hour >= 17 && hour < 21) {
        greeting = `Good Evening${namePart}!`;
      } else {
        greeting = `Good Night${namePart}!`;
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
        $or: [
          { updatedAt: { $gte: startOfDayUtc, $lte: endOfDayUtc } },
          { dueDate: { $gte: startOfDayUtc, $lte: endOfDayUtc } }
        ]
      }),
      Followup.countDocuments({
        owner: userId,
        status: 'completed',
        $or: [
          { updatedAt: { $gte: startOfDayUtc, $lte: endOfDayUtc } },
          { dueAt: { $gte: startOfDayUtc, $lte: endOfDayUtc } }
        ]
      }),
      SiteVisit.countDocuments({
        $or: [{ owner: userId }, { scheduledBy: userId }],
        status: 'completed',
        $or: [
          { updatedAt: { $gte: startOfDayUtc, $lte: endOfDayUtc } },
          { scheduledAt: { $gte: startOfDayUtc, $lte: endOfDayUtc } },
          { completedAt: { $gte: startOfDayUtc, $lte: endOfDayUtc } }
        ]
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
    const userKeyPrefix = String(userId);

    // ── PICK ONE MESSAGE BY PRIORITY ──────────────────────────────────────────

    // Priority a) Overdue follow-ups > 0: reminder with the real count
    if (overdueFollowups > 0) {
      messageType = 'reminder';
      const count = overdueFollowups;
      const s = count > 1 ? 's' : '';
      const overdueVariants = [
        `You have ${count} overdue follow-up${s}. Please call them first.`,
        `Action needed: You have ${count} overdue follow-up${s}. Please call them first.`,
        `Don't let leads go cold! You have ${count} overdue follow-up${s} waiting for action.`,
        `Gentle reminder: You have ${count} overdue follow-up${s} requiring attention. Let's reach out to them first.`
      ];
      selectedMessage = pickRotatingVariant(`${userKeyPrefix}_overdue`, overdueVariants);
    }
    // Priority b) Pending tasks or follow-ups due today > 0: reminder with the count
    else if (pendingTasks > 0 || followupsDueToday > 0) {
      messageType = 'reminder';
      if (followupsDueToday > 0 && pendingTasks > 0) {
        const fs = followupsDueToday > 1 ? 's' : '';
        const ts = pendingTasks > 1 ? 's' : '';
        const combinedVariants = [
          `You have ${followupsDueToday} follow-up${fs} due today and ${pendingTasks} pending task${ts}. You're on track, keep going!`,
          `${followupsDueToday} follow-up${fs} and ${pendingTasks} task${ts} are due today. You're on track, keep going!`,
          `You have ${followupsDueToday} follow-up${fs} and ${pendingTasks} task${ts} scheduled today. Keep up the great pace!`,
          `Stay focused: ${followupsDueToday} follow-up${fs} and ${pendingTasks} pending task${ts} today. You're on track!`
        ];
        selectedMessage = pickRotatingVariant(`${userKeyPrefix}_combined`, combinedVariants);
      } else if (followupsDueToday > 0) {
        const s = followupsDueToday > 1 ? 's' : '';
        const followupsVariants = [
          `${followupsDueToday} follow-up${s} ${followupsDueToday > 1 ? 'are' : 'is'} due today. You're on track, keep going.`,
          `You have ${followupsDueToday} follow-up${s} due today. You're on track, keep going!`,
          `${followupsDueToday} follow-up${s} scheduled for today. Keep up the good work!`,
          `Stay focused: ${followupsDueToday} follow-up${s} due today. You're on track, keep going.`
        ];
        selectedMessage = pickRotatingVariant(`${userKeyPrefix}_due_today`, followupsVariants);
      } else {
        const s = pendingTasks > 1 ? 's' : '';
        const tasksVariants = [
          `You have ${pendingTasks} pending task${s} today. You're on track, keep going.`,
          `${pendingTasks} task${pendingTasks > 1 ? 's are' : ' is'} due today. You're on track, keep going.`,
          `You have ${pendingTasks} task${s} to finish today. Keep up the momentum!`,
          `Stay on track: ${pendingTasks} pending task${s} today. Keep going!`
        ];
        selectedMessage = pickRotatingVariant(`${userKeyPrefix}_tasks`, tasksVariants);
      }
    }
    // Priority c) Site visit today not completed
    else if (pendingVisitsCount > 0) {
      messageType = 'reminder';
      const earliestVisit = pendingVisitsToday[0];
      const timeStr = earliestVisit && earliestVisit.scheduledAt
        ? new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Kolkata',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          }).format(new Date(earliestVisit.scheduledAt))
        : 'today';

      const siteVisitVariants = [
        `You have a site visit at ${timeStr}. Be ready.`,
        `Upcoming site visit today at ${timeStr}. Be ready.`,
        `Reminder: You have a site visit at ${timeStr} today. Be ready.`,
        `Client meeting ahead: You have a site visit at ${timeStr}. Be prepared!`
      ];
      selectedMessage = pickRotatingVariant(`${userKeyPrefix}_site_visit`, siteVisitVariants);
    }
    // Priority d) Everything complete but EOD pending (only after 5 PM / hour >= 17)
    else if (hour >= 17 && !isEodSubmitted && hasCompletedWorkToday) {
      messageType = 'reminder';
      const eodPendingVariants = [
        'All tasks done. Please submit your EOD report.',
        'Great work on your tasks today! Please submit your EOD report.',
        'All your tasks are done. Don\'t forget to submit your EOD report.',
        'Your tasks for today are completed. Please submit your EOD report.'
      ];
      selectedMessage = pickRotatingVariant(`${userKeyPrefix}_eod_pending`, eodPendingVariants);
    }
    // Priority e) ALL done: appreciation (no overdue, no pending tasks, no due follow-ups, no pending visits, EOD submitted if after 5 PM)
    else if (hasCompletedWorkToday && (hour < 17 || isEodSubmitted)) {
      messageType = 'appreciation';
      const appreciationVariants = [
        'Great work today! All your tasks are completed.',
        'Outstanding job today! All your tasks and follow-ups are completed.',
        'Fantastic effort today! Everything on your schedule is completed.',
        'Superb work today! All your tasks are done. Enjoy your rest!'
      ];
      selectedMessage = pickRotatingVariant(`${userKeyPrefix}_appreciation`, appreciationVariants);
    }
    // Priority f) No tasks assigned at all: neutral message, not praise
    else {
      messageType = 'info';
      const noTasksVariants = [
        'No tasks assigned yet. Check your leads and start calling.',
        'No pending tasks right now. Check your leads and start calling.',
        'Your task queue is empty. Check your leads and reach out to prospects.',
        'No tasks assigned for today. Review your pipeline and start calling.'
      ];
      selectedMessage = pickRotatingVariant(`${userKeyPrefix}_no_tasks`, noTasksVariants);
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
  pickRotatingVariant
};
