const cron = require('node-cron');
const Opportunity = require('../models/Opportunity');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Team = require('../models/Team');

/**
 * Sweeps the database for uncontacted 'new' opportunities and applies tiered SLA escalation:
 * - Tier 1 (36h): Mark slaBreached, set escalationLevel='employee', alert owner.
 * - Tier 2 (48h): Set escalationLevel='manager', notify owner's Team Lead.
 * - Tier 3 (72h): Set escalationLevel='reassignment_eligible', notify Team Lead & Admins.
 */
async function runSlaSweep(tier1Hours = 36, tier2Hours = 48, tier3Hours = 72) {
  const now = Date.now();
  const tier1Cutoff = new Date(now - tier1Hours * 60 * 60 * 1000);
  const tier2Cutoff = new Date(now - tier2Hours * 60 * 60 * 1000);
  const tier3Cutoff = new Date(now - tier3Hours * 60 * 60 * 1000);

  let processedCount = 0;

  // ── TIER 1: 36h SLA Breach (Employee Alert) ────────────────────────────────
  const tier1Opps = await Opportunity.find({
    isActive: true,
    stage: 'new',
    createdAt: { $lt: tier1Cutoff },
    escalationLevel: { $in: ['none', null] }
  }).populate('owner');

  for (const opp of tier1Opps) {
    opp.slaBreached = true;
    opp.escalationLevel = 'employee';
    await opp.save();
    processedCount++;

    if (opp.owner?._id) {
      await Notification.create({
        user: opp.owner._id,
        message: `⚠️ 36h SLA Alert: Immediate touchpoint required for lead #${opp._id}.`,
        link: `/leads/${opp._id}`,
        type: 'sla_breach'
      });
    }
  }

  // ── TIER 2: 48h SLA Escalation (Team Lead / Manager Alert) ─────────────────
  const tier2Opps = await Opportunity.find({
    isActive: true,
    stage: 'new',
    createdAt: { $lt: tier2Cutoff },
    escalationLevel: 'employee'
  }).populate('owner');

  for (const opp of tier2Opps) {
    opp.escalationLevel = 'manager';
    await opp.save();
    processedCount++;

    if (opp.owner?.teamId) {
      const team = await Team.findById(opp.owner.teamId).populate('teamLeadId');
      if (team?.teamLeadId?._id) {
        await Notification.create({
          user: team.teamLeadId._id,
          message: `🚨 48h Manager SLA Alert: Employee ${opp.owner.name} has uncontacted lead #${opp._id} >48 hours.`,
          link: `/leads/${opp._id}`,
          type: 'sla_breach'
        });
      }
    }
  }

  // ── TIER 3: 72h SLA Escalation (Reassignment Eligible & Admin Alert) ──────
  const tier3Opps = await Opportunity.find({
    isActive: true,
    stage: 'new',
    createdAt: { $lt: tier3Cutoff },
    escalationLevel: 'manager'
  }).populate('owner');

  const admins = await User.find({ role: { $in: ['admin', 'super_admin', 'director'] }, isActive: true });

  for (const opp of tier3Opps) {
    opp.escalationLevel = 'reassignment_eligible';
    await opp.save();
    processedCount++;

    if (opp.owner?.teamId) {
      const team = await Team.findById(opp.owner.teamId).populate('teamLeadId');
      if (team?.teamLeadId?._id) {
        await Notification.create({
          user: team.teamLeadId._id,
          message: `⚡ 72h Reassignment Eligible: Lead #${opp._id} is uncontacted >72h and eligible for reassignment.`,
          link: `/leads/${opp._id}`,
          type: 'sla_breach'
        });
      }
    }

    for (const adm of admins) {
      await Notification.create({
        user: adm._id,
        message: `⚡ 72h Reassignment Eligible: Lead #${opp._id} (Owner: ${opp.owner?.name || 'Unassigned'}) >72h stale.`,
        link: `/leads/${opp._id}`,
        type: 'sla_breach'
      });
    }
  }

  return processedCount;
}

function startSlaCron() {
  cron.schedule('*/30 * * * *', async () => {
    console.log('[SLA Sweep Job] Executing 36h/48h/72h tiered SLA escalation check...');
    try {
      const count = await runSlaSweep();
      console.log(`[SLA Sweep Job] Completed tiered SLA sweep. Processed ${count} escalated opportunities.`);
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
