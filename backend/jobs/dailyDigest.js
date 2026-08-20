const cron = require('node-cron');
const User = require('../models/User');
const Opportunity = require('../models/Opportunity');
const Activity = require('../models/Activity');
const Followup = require('../models/Followup');
const SiteVisit = require('../models/SiteVisit');
const DailyReport = require('../models/DailyReport');
const sendEmail = require('../utils/sendEmail');

/**
 * Aggregates today's employee performance metrics and dispatches a clean HTML summary email to ADMIN_ALERT_EMAIL.
 */
async function sendDailyDigest() {
  const adminAlertEmail = process.env.ADMIN_ALERT_EMAIL;
  if (!adminAlertEmail || !adminAlertEmail.trim()) {
    console.log('[Daily Digest Job] ADMIN_ALERT_EMAIL not configured. Skipping daily summary email.');
    return;
  }

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const formattedDateStr = now.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const activeEmployees = await User.find({ isActive: true })
    .select('name email role employeeId')
    .sort({ name: 1 });

  const rows = [];

  for (const emp of activeEmployees) {
    const [
      newLeads,
      activities,
      followups,
      siteVisits,
      dailyReport
    ] = await Promise.all([
      Opportunity.countDocuments({ owner: emp._id, createdAt: { $gte: startOfDay, $lte: endOfDay } }),
      Activity.countDocuments({ user: emp._id, createdAt: { $gte: startOfDay, $lte: endOfDay } }),
      Followup.countDocuments({ assignedTo: emp._id, status: 'completed', updatedAt: { $gte: startOfDay, $lte: endOfDay } }),
      SiteVisit.countDocuments({ assignedTo: emp._id, status: 'completed', updatedAt: { $gte: startOfDay, $lte: endOfDay } }),
      DailyReport.findOne({ user: emp._id, date: todayStr })
    ]);

    let reportStatusHtml = '<span style="color: #94a3b8;">Pending</span>';
    if (dailyReport) {
      if (dailyReport.discrepancyFlag) {
        reportStatusHtml = '<span style="color: #f59e0b; font-weight: bold;">⚠️ Flagged</span>';
      } else {
        reportStatusHtml = '<span style="color: #10b981; font-weight: bold;">✓ Submitted</span>';
      }
    }

    rows.push(`
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px; font-weight: bold; color: #1e293b;">
          ${emp.name} <br/>
          <span style="font-size: 11px; color: #64748b; font-family: monospace;">[${emp.employeeId || 'SYS'}] ${emp.role.toUpperCase()}</span>
        </td>
        <td style="padding: 10px; text-align: center; font-family: monospace; font-weight: bold;">${newLeads}</td>
        <td style="padding: 10px; text-align: center; font-family: monospace; font-weight: bold;">${activities}</td>
        <td style="padding: 10px; text-align: center; font-family: monospace; font-weight: bold;">${followups}</td>
        <td style="padding: 10px; text-align: center; font-family: monospace; font-weight: bold;">${siteVisits}</td>
        <td style="padding: 10px; text-align: center; font-size: 12px;">${reportStatusHtml}</td>
      </tr>
    `);
  }

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #0f172a; max-width: 680px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <h2 style="color: #4f46e5; margin-top: 0; font-size: 20px;">Omvik CRM — Daily Performance Digest</h2>
      <p style="font-size: 13px; color: #64748b; margin-top: 4px;">Summary report for <strong>${formattedDateStr}</strong></p>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px;">
        <thead>
          <tr style="background-color: #f8fafc; border-bottom: 2px solid #cbd5e1; text-align: left; font-size: 11px; text-transform: uppercase; color: #475569;">
            <th style="padding: 10px;">Employee</th>
            <th style="padding: 10px; text-align: center;">New Leads</th>
            <th style="padding: 10px; text-align: center;">Activities</th>
            <th style="padding: 10px; text-align: center;">Follow-ups</th>
            <th style="padding: 10px; text-align: center;">Site Visits</th>
            <th style="padding: 10px; text-align: center;">EOD Report</th>
          </tr>
        </thead>
        <tbody>
          ${rows.join('')}
        </tbody>
      </table>

      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0 16px 0;" />
      <p style="font-size: 11px; color: #94a3b8; margin: 0;">Automated Daily Digest • OMVIK Realcon CRM System</p>
    </div>
  `;

  const subject = `Omvik CRM — Daily Summary, ${formattedDateStr}`;

  try {
    await sendEmail({
      email: adminAlertEmail.trim(),
      subject,
      message: `Omvik CRM Daily Performance Digest for ${formattedDateStr}`,
      html: htmlBody
    });
    console.log(`[Daily Digest Job] Successfully sent daily performance digest to ${adminAlertEmail}`);
  } catch (error) {
    console.error('[Daily Digest Job Error] Failed to send daily digest email:', error.message);
  }
}

function startDailyDigestCron() {
  // Cron schedule: 8:00 PM daily (0 20 * * *)
  cron.schedule('0 20 * * *', async () => {
    console.log('[Daily Digest Job] Executing 8:00 PM daily performance digest...');
    try {
      await sendDailyDigest();
    } catch (error) {
      console.error('[Daily Digest Job Error]:', error);
    }
  });

  console.log('[Daily Digest Job] Scheduled daily digest cron running at 8:00 PM (0 20 * * *).');
}

module.exports = {
  sendDailyDigest,
  startDailyDigestCron
};
