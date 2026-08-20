const sendEmail = require('./sendEmail');

/**
 * Sends a short, glanceable email notification to the Admin Alert Inbox for critical CRM events.
 * Read target address strictly from process.env.ADMIN_ALERT_EMAIL.
 *
 * @param {Object} options
 * @param {string} options.subject - Email subject line
 * @param {string} options.message - Plain text message
 * @param {string} [options.html] - Optional HTML formatted body
 */
const sendAdminAlert = async ({ subject, message, html }) => {
  const adminAlertEmail = process.env.ADMIN_ALERT_EMAIL;

  if (!adminAlertEmail || !adminAlertEmail.trim()) {
    console.log('[sendAdminAlert Notice] ADMIN_ALERT_EMAIL is not set in environment. Skipping admin alert.');
    return;
  }

  try {
    await sendEmail({
      email: adminAlertEmail.trim(),
      subject: `🚨 [OMVIK Alert] ${subject}`,
      message,
      html: html || `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #0f172a; max-width: 500px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <h3 style="color: #4f46e5; margin-top: 0;">${subject}</h3>
          <p style="font-size: 14px; color: #334155; line-height: 1.5;">${message}</p>
          <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 16px 0;" />
          <p style="font-size: 11px; color: #94a3b8; margin: 0;">OMVIK CRM Critical Security & Operation Alert • ${new Date().toLocaleString()}</p>
        </div>
      `
    });
    console.log(`[sendAdminAlert] Admin alert email dispatched to ${adminAlertEmail} for "${subject}"`);
  } catch (error) {
    console.error(`[sendAdminAlert Error] Failed to dispatch admin alert for "${subject}":`, error.message);
  }
};

module.exports = sendAdminAlert;
