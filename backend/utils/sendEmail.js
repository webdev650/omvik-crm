const { Resend } = require('resend');

const sendEmail = async (options) => {
  const targetRecipient = options.email || process.env.ADMIN_ALERT_EMAIL || 'omvikrealcon@gmail.com';
  const subject = options.subject;
  const message = options.message;
  const html = options.html;

  // Primary Engine: Resend API (Fast & Async)
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';
      const fromHeader = `OMVIK CRM <${fromEmail}>`;

      const { data, error } = await resend.emails.send({
        from: fromHeader,
        to: targetRecipient,
        subject,
        text: message,
        html
      });

      if (error) {
        console.error('[Resend API Error]', error.message || error);
      } else if (data && data.id) {
        console.log(`✅ [Resend Email Delivered] ID: ${data.id} -> ${targetRecipient}`);
        return data;
      }
    } catch (resendErr) {
      console.error('[Resend Exception]', resendErr.message);
    }
  }

  // Fallback: Console Logging
  console.log(`\n======================================================`);
  console.log(`🔑 [OTP EMAIL DELIVERED TO CONSOLE]`);
  console.log(`To: ${targetRecipient}`);
  console.log(`Subject: ${subject}`);
  console.log(`Message: ${message}`);
  console.log(`======================================================\n`);

  return { status: 'logged_to_console' };
};

module.exports = sendEmail;
