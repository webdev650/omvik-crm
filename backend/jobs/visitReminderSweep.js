const cron = require('node-cron');
const VisitReminder = require('../models/VisitReminder');
const Notification = require('../models/Notification');

/**
 * Sweeps for unfired VisitReminder records whose scheduledFor has passed.
 * For each, creates a high-priority 'visit_reminder' Notification for the
 * assigned employee (siteVisit.owner or siteVisit.scheduledBy).
 *
 * Runs every 5 minutes for better timing precision than the 30-min followup sweep.
 *
 * BROWSER LIMITATION NOTE:
 * These notifications are delivered to MongoDB and polled by the frontend every 60s.
 * This system only works while the user has the CRM tab open in their browser.
 * It cannot alert someone whose tab is closed or who isn't on the page — this is
 * a fundamental browser constraint (no JavaScript can run in a closed tab).
 * For true push notifications while the tab is closed, a service worker + Web Push
 * subscription infrastructure would be required.
 */
async function runVisitReminderSweep() {
  const now = new Date();

  const dueReminders = await VisitReminder.find({
    scheduledFor: { $lte: now },
    fired: false
  }).populate({
    path: 'siteVisit',
    populate: [
      {
        path: 'opportunity',
        populate: [
          { path: 'customer', select: 'name primaryMobile' },
          { path: 'project', select: 'name location' }
        ]
      },
      { path: 'owner', select: 'name email _id' },
      { path: 'scheduledBy', select: 'name email _id' }
    ]
  });

  if (dueReminders.length === 0) return 0;

  const REMINDER_LABELS = {
    day_before:     'Day-Before Reminder',
    morning_of:     'Morning-Of Reminder',
    final_reminder: 'Final Reminder (1 hour away)'
  };

  let firedCount = 0;

  for (const reminder of dueReminders) {
    const sv = reminder.siteVisit;
    if (!sv) {
      // SiteVisit was deleted — mark fired to skip future sweeps
      reminder.fired = true;
      await reminder.save();
      continue;
    }

    const customerName = sv.opportunity?.customer?.name ?? 'Unknown Customer';
    const projectName  = sv.opportunity?.project?.name ?? '';
    const visitTime    = sv.scheduledAt
      ? new Date(sv.scheduledAt).toLocaleString('en-IN', {
          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true
        })
      : 'Scheduled';
    const typeLabel = REMINDER_LABELS[reminder.type] ?? reminder.type;
    const oppId = sv.opportunity?._id ?? '';

    const message = `🏡 Site Visit ${typeLabel}: ${customerName}${projectName ? ` — ${projectName}` : ''} at ${visitTime}`;

    // Determine recipient: prefer siteVisit.owner, fallback to scheduledBy
    const recipientId = sv.owner?._id ?? sv.scheduledBy?._id;

    if (!recipientId) {
      console.warn(`[VisitReminderSweep] SiteVisit ${sv._id} has no owner or scheduledBy — skipping notification`);
      reminder.fired = true;
      await reminder.save();
      continue;
    }

    await Notification.create({
      user:     recipientId,
      message,
      link:     oppId ? `/leads/${oppId}` : '',
      type:     'visit_reminder',
      priority: 'high',
      isRead:   false,
      acknowledgedAt: null
    });

    reminder.fired = true;
    await reminder.save();
    firedCount++;

    console.log(`[VisitReminderSweep] Fired ${reminder.type} reminder for SiteVisit ${sv._id} → Notification created for user ${recipientId}`);
  }

  return firedCount;
}

/**
 * Initializes the 5-minute visit reminder cron job.
 */
function startVisitReminderCron() {
  cron.schedule('*/5 * * * *', async () => {
    console.log('[VisitReminderSweep] Running sweep...');
    try {
      const count = await runVisitReminderSweep();
      if (count > 0) {
        console.log(`[VisitReminderSweep] Fired ${count} reminder notification(s).`);
      }
    } catch (error) {
      console.error('[VisitReminderSweep] Error:', error.message);
    }
  });

  console.log('[VisitReminderSweep] Scheduled — runs every 5 minutes (*/5 * * * *).');
}

module.exports = {
  runVisitReminderSweep,
  startVisitReminderCron
};
