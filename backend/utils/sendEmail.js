const { Resend } = require('resend');
const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // Always enforce delivery to omvikrealcon@gmail.com if specified, or target recipient
  const targetRecipient = options.email || process.env.ADMIN_ALERT_EMAIL || 'omvikrealcon@gmail.com';
  const subject = options.subject;
  const message = options.message;
  const html = options.html;

  // 1. Primary Engine: Resend API (Verified Working)
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
        console.error('[Resend API Error]', error);
      } else {
        console.log(`✅ [Resend Email Delivered] ID: ${data?.id} -> ${targetRecipient}`);
        return data;
      }
    } catch (resendErr) {
      console.error('[Resend Exception]', resendErr.message);
    }
  }

  // 2. Secondary Engine: Nodemailer SMTP if configured
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      const mailOptions = {
        from: `OMVIK CRM <${process.env.SMTP_USER}>`,
        to: targetRecipient,
        subject,
        text: message,
        html
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ [Nodemailer SMTP Delivered] ID: ${info.messageId} -> ${targetRecipient}`);
      return info;
    } catch (smtpErr) {
      console.error('[Nodemailer SMTP Error]', smtpErr.message);
    }
  }

  // 3. Fallback: Console Logging for Development
  console.log(`\n======================================================`);
  console.log(`🔑 [OTP EMAIL DELIVERED TO CONSOLE]`);
  console.log(`To: ${targetRecipient}`);
  console.log(`Subject: ${subject}`);
  console.log(`Message: ${message}`);
  console.log(`======================================================\n`);

  return { status: 'logged_to_console' };
};

module.exports = sendEmail;
