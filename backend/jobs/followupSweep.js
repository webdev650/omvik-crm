const cron = require('node-cron');
const Followup = require('../models/Followup');
const Notification = require('../models/Notification');

/**
 * Sweeps the database for scheduled followups past dueAt and marks them as overdue.
 * Generates notification for followup owners.
 *
 * @returns {Promise<Number>} Count of overdue followups processed
 */
async function runFollowupSweep() {
  const now = new Date();

  const overdueFollowups = await Followup.find({
    status: 'scheduled',
    dueAt: { $lt: now }
  });

  let processedCount = 0;

  for (const followup of overdueFollowups) {
    followup.status = 'overdue';
    await followup.save();
    processedCount++;

    if (followup.owner) {
      await Notification.create({
        user: followup.owner,
        message: `Follow-up Overdue: Scheduled follow-up for opportunity #${followup.opportunity} is past due (${followup.dueAt.toISOString()}).`,
        link: `/opportunities/${followup.opportunity}`,
        type: 'activity'
      });
    }
  }

  return processedCount;
}

/**
 * Initializes and schedules the 30-minute followup sweep cron job.
 */
function startFollowupCron() {
  cron.schedule('*/30 * * * *', async () => {
    console.log('[Followup Sweep Job] Executing overdue followups check...');
    try {
      const count = await runFollowupSweep();
      console.log(`[Followup Sweep Job] Completed sweep. Marked ${count} followups as overdue.`);
    } catch (error) {
      console.error('[Followup Sweep Job] Error executing followup sweep:', error);
    }
  });

  console.log('[Followup Sweep Job] Scheduled cron running every 30 minutes (*/30 * * * *).');
}

module.exports = {
  runFollowupSweep,
  startFollowupCron
};
