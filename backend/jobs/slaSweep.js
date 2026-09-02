const cron = require('node-cron');
const Opportunity = require('../models/Opportunity');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Team = require('../models/Team');
const Leave = require('../models/Leave');
const sendAdminAlert = require('../utils/sendAdminAlert');
const sendEmail = require('../utils/sendEmail');

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
 * - Tier 1 (48h + leaveHours): Mark slaBreached, set escalationLevel='employee', alert owner via in-app & email.
 * - Tier 2 (72h + leaveHours): Set escalationLevel='manager', notify owner's Team Lead.
 * - Tier 3 (96h + leaveHours): Set escalationLevel='reassignment_eligible', notify Team Lead & Admins.
 */
async function runSlaSweep(tier1Hours = 48, tier2Hours = 72, tier3Hours = 96) {
  const now = new Date();
  let processedCount = 0;

  // Find all active opportunities currently in stage 'new'
  const newOpps = await Opportunity.find({
    isActive: true,
    stage: 'new'
  }).populate('owner').populate('customer').populate('project');

  const admins = await User.find({ role: { $in: ['admin', 'super_admin', 'director'] }, isActive: true });

  // Map to collect newly breached opportunities per employee for batched email dispatch
  const employeeBreachesMap = new Map();

  for (const opp of newOpps) {
    const oppOwnerId = opp.owner?._id || opp.owner;
    const leaveHours = await calculateOverlappingLeaveHours(oppOwnerId, opp.createdAt, now);

    const adjustedTier1 = tier1Hours + leaveHours;
    const adjustedTier2 = tier2Hours + leaveHours;
    const adjustedTier3 = tier3Hours + leaveHours;

    const oppAgeHours = (now.getTime() - new Date(opp.createdAt).getTime()) / (1000 * 60 * 60);
    const currentEscalation = opp.escalationLevel || 'none';

    // ── TIER 1: 48h + Leave (Employee SLA Breach Alert) ────────────────────
    if (currentEscalation === 'none' && oppAgeHours >= adjustedTier1) {
      opp.slaBreached = true;
      opp.escalationLevel = 'employee';
      await opp.save();
      processedCount++;

      if (opp.owner?._id) {
        // Create In-App Notification
        await Notification.create({
          user: opp.owner._id,
          message: `⚠️ SLA Alert: Immediate touchpoint required for lead #${opp._id} (Adjusted deadline: ${Math.round(adjustedTier1)}h).`,
          link: `/leads/${opp._id}`,
          type: 'sla_breach'
        });

        // Collect for batched email email dispatch
        const empIdStr = opp.owner._id.toString();
        if (!employeeBreachesMap.has(empIdStr)) {
          employeeBreachesMap.set(empIdStr, {
            owner: opp.owner,
            leads: []
          });
        }
        employeeBreachesMap.get(empIdStr).leads.push(opp);
      }
    }

    // ── TIER 2: 72h + Leave (Manager SLA Alert) ────────────────────────────
    if (opp.escalationLevel === 'employee' && oppAgeHours >= adjustedTier2) {
      opp.escalationLevel = 'manager';
      await opp.save();
      processedCount++;

      if (opp.owner?.teamId) {
        const team = await Team.findById(opp.owner.teamId).populate('teamLeadId');
        if (team?.teamLeadId?._id) {
          await Notification.create({
            user: team.teamLeadId._id,
            message: `🚨 72h Manager SLA Alert: Employee ${opp.owner.name} has uncontacted lead #${opp._id} >${Math.round(adjustedTier2)} hours.`,
            link: `/leads/${opp._id}`,
            type: 'sla_breach'
          });
        }
      }
    }

    // ── TIER 3: 96h + Leave (Reassignment Eligible & Admin Alert) ──────────
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

      sendAdminAlert({
        subject: `96h Reassignment Eligible Lead #${opp._id}`,
        message: `Opportunity #${opp._id} (Owner: ${opp.owner?.name || 'Unassigned'}) has been uncontacted >${Math.round(adjustedTier3)}h and is now eligible for reassignment.`
      });
    }
  }

  // ── DISPATCH BATCHED SLA EMAIL NOTIFICATIONS (ONE EMAIL PER EMPLOYEE) ────
  for (const [empIdStr, data] of employeeBreachesMap.entries()) {
    const { owner, leads } = data;
    const count = leads.length;
    if (count === 0) continue;

    // Find Team Lead email if team assigned
    let teamLeadEmail = null;
    if (owner.teamId) {
      const team = await Team.findById(owner.teamId).populate('teamLeadId');
      if (team?.teamLeadId?.email) {
        teamLeadEmail = team.teamLeadId.email;
      }
    }

    const leadListHtml = leads.map(l => `
      <li style="margin-bottom: 8px;">
        <strong>Customer:</strong> ${l.customer?.name || 'Prospect'} (${l.customer?.primaryMobile || 'No Phone'})<br/>
        <strong>Project:</strong> ${l.project?.name || 'Project'} | <strong>Age:</strong> ${Math.round((now.getTime() - new Date(l.createdAt).getTime()) / (1000 * 60 * 60))} hours overdue
      </li>
    `).join('');

    const subject = `⚠️ SLA Alert: You have ${count} uncontacted lead${count > 1 ? 's' : ''} past 48 hours - OMVIK CRM`;
    const message = `Hello ${owner.name},\n\nYou have ${count} uncontacted lead(s) past the 48-hour SLA deadline. Please log into OMVIK CRM and initiate contact immediately.`;

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 24px; color: #0f172a; max-width: 540px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
        <h2 style="color: #dc2626; font-size: 20px; margin-bottom: 8px;">⚠️ 48-Hour SLA Breach Alert</h2>
        <p style="font-size: 14px; color: #475569; margin-top: 0;">Hello <strong>${owner.name}</strong>,</p>
        <p style="font-size: 14px; color: #334155;">
          You have <strong style="color: #dc2626;">${count} uncontacted lead${count > 1 ? 's' : ''}</strong> that have exceeded the 48-hour response SLA threshold:
        </p>
        <ul style="font-size: 13px; color: #1e293b; background-color: #f8fafc; padding: 16px 20px 16px 36px; border-radius: 12px; border: 1px solid #e2e8f0;">
          ${leadListHtml}
        </ul>
        <p style="font-size: 13px; color: #475569; margin-top: 16px;">
          Please log into your OMVIK CRM Daily Action Inbox immediately to call or record an activity for these leads.
        </p>
      </div>
    `;

    try {
      await sendEmail({
        email: owner.email || 'omvikrealcon@gmail.com',
        subject,
        message,
        html
      });
      console.log(`✅ [SLA Email Dispatched] Sent 48h SLA breach email to ${owner.email} (${count} leads)`);

      // If team lead email exists and is different from employee, also notify team lead
      if (teamLeadEmail && teamLeadEmail !== owner.email) {
        await sendEmail({
          email: teamLeadEmail,
          subject: `🚨 Team SLA Breach: Rep ${owner.name} has ${count} leads past 48 hours`,
          message: `Team Lead Notice: Rep ${owner.name} has ${count} uncontacted leads past 48 hours.`,
          html
        });
      }
    } catch (emailErr) {
      console.error(`❌ [SLA Email Error] Failed to send SLA alert email to ${owner.email}:`, emailErr.message);
    }
  }

  return processedCount;
}

function startSlaCron() {
  cron.schedule('*/30 * * * *', async () => {
    console.log('[SLA Sweep Job] Executing leave-aware 48h SLA escalation check...');
    try {
      const count = await runSlaSweep();
      console.log(`[SLA Sweep Job] Completed SLA sweep. Processed ${count} escalated opportunities.`);
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
