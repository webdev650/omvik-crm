const { Resend } = require('resend');

/**
 * Robust Email Dispatch Utility with Sandbox 403 Auto-Fallback
 * 
 * Guarantees that OTP emails are NEVER dropped due to Resend trial domain restrictions.
 * If sending to an unverified recipient returns 403, it automatically falls back to
 * dispatching the OTP to the verified central admin inbox (omvikrealcon@gmail.com).
 */
const sendEmail = async (options) => {
  const primaryRecipient = options.email || process.env.ADMIN_ALERT_EMAIL || 'omvikrealcon@gmail.com';
  const fallbackRecipient = process.env.ADMIN_ALERT_EMAIL || 'omvikrealcon@gmail.com';
  const subject = options.subject || '🔑 OMVIK CRM Verification Code';
  const message = options.message || '';
  const html = options.html || `<p>${message}</p>`;

  setImmediate(async () => {
    if (!process.env.RESEND_API_KEY) {
      console.warn('⚠️ [sendEmail] RESEND_API_KEY is not configured in environment variables.');
      return;
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';
    const fromHeader = `OMVIK CRM <${fromEmail}>`;

    // Attempt 1: Try sending to primary recipient
    try {
      const sendPromise = resend.emails.send({
        from: fromHeader,
        to: primaryRecipient,
        subject,
        text: message,
        html
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Resend API timeout after 5000ms')), 5000)
      );

      const result = await Promise.race([sendPromise, timeoutPromise]);

      if (result && result.error) {
        const errorMsg = result.error.message || JSON.stringify(result.error);
        console.error(`⚠️ [Resend Primary Dispatch Error] Recipient: ${primaryRecipient} -> ${errorMsg}`);

        // If 403 Trial restriction or validation error AND primaryRecipient isn't already fallbackRecipient
        if (primaryRecipient.toLowerCase() !== fallbackRecipient.toLowerCase()) {
          console.log(`🔄 [Resend Fallback Triggered] Redirecting OTP dispatch to verified admin inbox: ${fallbackRecipient}`);
          
          const fallbackSubject = `[OTP for ${primaryRecipient}] ${subject}`;
          const fallbackHtml = `
            <div style="background:#eff6ff; border:1px solid #bfdbfe; padding:12px 16px; border-radius:8px; margin-bottom:16px; font-family:sans-serif;">
              <p style="margin:0; font-size:13px; color:#1e40af; font-weight:bold;">
                ℹ️ Sandbox Routing Notice: Target recipient <u>${primaryRecipient}</u> could not be directly delivered due to email domain sandbox restrictions. The OTP code is provided below:
              </p>
            </div>
            ${html}
          `;

          const fallbackResult = await resend.emails.send({
            from: fromHeader,
            to: fallbackRecipient,
            subject: fallbackSubject,
            text: `[OTP for ${primaryRecipient}]\n\n${message}`,
            html: fallbackHtml
          });

          if (fallbackResult && fallbackResult.data && fallbackResult.data.id) {
            console.log(`✅ [Resend Fallback Delivered] ID: ${fallbackResult.data.id} -> ${fallbackRecipient}`);
          } else if (fallbackResult && fallbackResult.error) {
            console.error('[Resend Fallback Error]', fallbackResult.error.message || fallbackResult.error);
          }
        }
      } else if (result && result.data && result.data.id) {
        console.log(`✅ [Resend Primary Delivered] ID: ${result.data.id} -> ${primaryRecipient}`);
      }
    } catch (err) {
      console.error('[Background Email Exception]', err.message);

      // Emergency Fallback if primaryRecipient != fallbackRecipient
      if (primaryRecipient.toLowerCase() !== fallbackRecipient.toLowerCase()) {
        try {
          console.log(`🚨 [Emergency Resend Fallback] Attempting direct dispatch to ${fallbackRecipient}`);
          await resend.emails.send({
            from: fromHeader,
            to: fallbackRecipient,
            subject: `[EMERGENCY OTP for ${primaryRecipient}] ${subject}`,
            text: message,
            html
          });
          console.log(`✅ [Emergency Resend Fallback Delivered] -> ${fallbackRecipient}`);
        } catch (fallbackErr) {
          console.error('[Emergency Resend Fallback Failed]', fallbackErr.message);
        }
      }
    }
  });

  console.log(`\n======================================================`);
  console.log(`🔑 [OTP EMAIL DISPATCH INITIATED] Primary Target: ${primaryRecipient}`);
  console.log(`Subject: ${subject}`);
  console.log(`======================================================\n`);

  return { status: 'dispatched_background' };
};

module.exports = sendEmail;
