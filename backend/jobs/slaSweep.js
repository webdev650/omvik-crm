const cron = require('node-cron');
const Opportunity = require('../models/Opportunity');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Team = require('../models/Team');
const Leave = require('../models/Leave');

/**
 * Calculates overlapping approved leave hours for a given owner within [oppCreatedAt, now]
 */
async function calculateOverlappingLeaveHours(userId, oppCreatedAt, now) {
  if (!userId) return 0;

  const leaves = await Leave.find({
    user: userId,
    status: 'approved',
    startDate: { $lt: now },
    endDate: { $gt: oppCreatedAt }
  });

  let totalMs = 0;
  const oppStartMs = new Date(oppCreatedAt).getTime();
  const nowMs = new Date(now).getTime();

  for (const l of leaves) {
    const leaveStartMs = new Date(l.startDate).getTime();
    const leaveEndMs = new Date(l.endDate).getTime();

    const overlapStart = Math.max(oppStartMs, leaveStartMs);
    const overlapEnd = Math.min(nowMs, leaveEndMs);

    if (overlapEnd > overlapStart) {
      totalMs += (overlapEnd - overlapStart);
    }
  }

  return totalMs / (1000 * 60 * 60); // Return total leave hours during window
}

/**
 * Sweeps the database for uncontacted 'new' opportunities and applies leave-aware tiered SLA escalation:
 * - Tier 1 (36h + leaveHours): Mark slaBreached, set escalationLevel='employee', alert owner.
 * - Tier 2 (48h + leaveHours): Set escalationLevel='manager', notify owner's Team Lead.
 * - Tier 3 (72h + leaveHours): Set escalationLevel='reassignment_eligible', notify Team Lead & Admins.
 */
async function runSlaSweep(tier1Hours = 36, tier2Hours = 48, tier3Hours = 72) {
  const now = new Date();
  let processedCount = 0;

  // Find all active opportunities currently in stage 'new'
  const newOpps = await Opportunity.find({
    isActive: true,
    stage: 'new'
  }).populate('owner');

  const admins = await User.find({ role: { $in: ['admin', 'super_admin', 'director'] }, isActive: true });

  for (const opp of newOpps) {
    const oppOwnerId = opp.owner?._id || opp.owner;
    const leaveHours = await calculateOverlappingLeaveHours(oppOwnerId, opp.createdAt, now);

    const adjustedTier1 = tier1Hours + leaveHours;
    const adjustedTier2 = tier2Hours + leaveHours;
    const adjustedTier3 = tier3Hours + leaveHours;

    const oppAgeHours = (now.getTime() - new Date(opp.createdAt).getTime()) / (1000 * 60 * 60);

    const currentEscalation = opp.escalationLevel || 'none';

    // ── TIER 1: 36h + Leave (Employee SLA Breach Alert) ────────────────────
    if (currentEscalation === 'none' && oppAgeHours >= adjustedTier1) {
      opp.slaBreached = true;
      opp.escalationLevel = 'employee';
      await opp.save();
      processedCount++;

      if (opp.owner?._id) {
        await Notification.create({
          user: opp.owner._id,
          message: `⚠️ SLA Alert: Immediate touchpoint required for lead #${opp._id} (Adjusted deadline: ${Math.round(adjustedTier1)}h).`,
          link: `/leads/${opp._id}`,
          type: 'sla_breach'
        });
      }
    }

    // ── TIER 2: 48h + Leave (Manager SLA Alert) ────────────────────────────
    if (opp.escalationLevel === 'employee' && oppAgeHours >= adjustedTier2) {
      opp.escalationLevel = 'manager';
      await opp.save();
      processedCount++;

      if (opp.owner?.teamId) {
        const team = await Team.findById(opp.owner.teamId).populate('teamLeadId');
        if (team?.teamLeadId?._id) {
          await Notification.create({
            user: team.teamLeadId._id,
            message: `🚨 48h Manager SLA Alert: Employee ${opp.owner.name} has uncontacted lead #${opp._id} >${Math.round(adjustedTier2)} hours.`,
            link: `/leads/${opp._id}`,
            type: 'sla_breach'
          });
        }
      }
    }

    // ── TIER 3: 72h + Leave (Reassignment Eligible & Admin Alert) ──────────
    if (opp.escalationLevel === 'manager' && oppAgeHours >= adjustedTier3) {
      opp.escalationLevel = 'reassignment_eligible';
      await opp.save();
      processedCount++;

      if (opp.owner?.teamId) {
        const team = await Team.findById(opp.owner.teamId).populate('teamLeadId');
        if (team?.teamLeadId?._id) {
          await Notification.create({
            user: team.teamLeadId._id,
            message: `⚡ Reassignment Eligible: Lead #${opp._id} is uncontacted >${Math.round(adjustedTier3)}h and eligible for reassignment.`,
            link: `/leads/${opp._id}`,
            type: 'sla_breach'
          });
        }
      }

      for (const adm of admins) {
        await Notification.create({
          user: adm._id,
          message: `⚡ Reassignment Eligible: Lead #${opp._id} (Owner: ${opp.owner?.name || 'Unassigned'}) >${Math.round(adjustedTier3)}h stale.`,
          link: `/leads/${opp._id}`,
          type: 'sla_breach'
        });
      }
    }
  }

  return processedCount;
}

function startSlaCron() {
  cron.schedule('*/30 * * * *', async () => {
    console.log('[SLA Sweep Job] Executing leave-aware tiered SLA escalation check...');
    try {
      const count = await runSlaSweep();
      console.log(`[SLA Sweep Job] Completed leave-aware SLA sweep. Processed ${count} escalated opportunities.`);
    } catch (error) {
      console.error('[SLA Sweep Job] Error executing SLA sweep:', error);
    }
  });

  console.log('[SLA Sweep Job] Scheduled cron running every 30 minutes (*/30 * * * *).');
}

module.exports = {
  calculateOverlappingLeaveHours,
  runSlaSweep,
  startSlaCron
};
