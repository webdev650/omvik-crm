const cron = require('node-cron');
const Opportunity = require('../models/Opportunity');
const Notification = require('../models/Notification');

/**
 * Sweeps the database for opportunities in 'new' stage older than 36 hours
 * and marks them as SLA breached while creating notifications for owners.
 *
 * @param {Number} cutoffHours - Cutoff threshold in hours (default 36)
 * @returns {Promise<Number>} Count of SLA breached opportunities processed
 */
async function runSlaSweep(cutoffHours = 36) {
  const cutoffDate = new Date(Date.now() - cutoffHours * 60 * 60 * 1000);

  const breachedOpportunities = await Opportunity.find({
    isActive: true,
    stage: 'new',
    createdAt: { $lt: cutoffDate },
    slaBreached: { $ne: true }
  });

  let processedCount = 0;

  for (const opportunity of breachedOpportunities) {
    opportunity.slaBreached = true;
    await opportunity.save();
    processedCount++;

    if (opportunity.owner) {
      await Notification.create({
        user: opportunity.owner,
        message: `SLA Breached: Opportunity #${opportunity._id} has remained in 'new' stage for over 36 hours without action.`,
        link: `/opportunities/${opportunity._id}`,
        type: 'sla_breach'
      });
    }
  }

  return processedCount;
}

/**
 * Initializes and schedules the 30-minute SLA sweep cron job.
 */
function startSlaCron() {
  cron.schedule('*/30 * * * *', async () => {
    console.log('[SLA Sweep Job] Executing 36-hour SLA breach check...');
    try {
      const count = await runSlaSweep(36);
      console.log(`[SLA Sweep Job] Completed SLA sweep. Marked ${count} opportunities as SLA breached.`);
    } catch (error) {
      console.error('[SLA Sweep Job] Error executing SLA sweep:', error);
    }
  });

  console.log('[SLA Sweep Job] Scheduled cron running every 30 minutes (*/30 * * * *).');
}

module.exports = {
  runSlaSweep,
  startSlaCron
};
