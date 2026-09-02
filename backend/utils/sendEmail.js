const { Resend } = require('resend');

const sendEmail = async (options) => {
  const targetRecipient = options.email || process.env.ADMIN_ALERT_EMAIL || 'omvikrealcon@gmail.com';
  const subject = options.subject;
  const message = options.message;
  const html = options.html;

  // Execute in isolated setImmediate tick to completely uncouple from Express HTTP request socket
  setImmediate(async () => {
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';
        const fromHeader = `OMVIK CRM <${fromEmail}>`;

        // Enforce strict 4-second timeout on Resend API call
        const sendPromise = resend.emails.send({
          from: fromHeader,
          to: targetRecipient,
          subject,
          text: message,
          html
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Resend API timeout after 4000ms')), 4000)
        );

        const result = await Promise.race([sendPromise, timeoutPromise]);
        if (result && result.error) {
          console.error('[Resend API Error]', result.error.message || result.error);
        } else if (result && result.data && result.data.id) {
          console.log(`✅ [Resend Email Delivered] ID: ${result.data.id} -> ${targetRecipient}`);
        }
      } catch (err) {
        console.error('[Background Email Dispatch Error]', err.message);
      }
    }
  });

  console.log(`\n======================================================`);
  console.log(`🔑 [OTP EMAIL DISPATCHED] To: ${targetRecipient}`);
  console.log(`Subject: ${subject}`);
  console.log(`======================================================\n`);

  return { status: 'dispatched_background' };
};

module.exports = sendEmail;
