const nodemailer = require('nodemailer');
const { Resend } = require('resend');

const sendEmail = async (options) => {
  const fromName = process.env.FROM_NAME || 'OMVIK CRM';
  const smtpUser = process.env.SMTP_USER || 'omvikrealcon@gmail.com';
  const fromHeader = `"${fromName}" <${smtpUser}>`;

  // 1. Primary Email Transport: Gmail Direct SMTP (Delivers directly to real inbox omvikrealcon@gmail.com)
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS.replace(/\s+/g, '')
        }
      });

      const info = await transporter.sendMail({
        from: fromHeader,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html
      });

      console.log(`[Gmail SMTP Delivered Successfully] ID: ${info.messageId} -> ${options.email}`);
      return info;
    } catch (gmailErr) {
      console.error('[Gmail Direct SMTP Failed]', gmailErr.message);
    }
  }

  // 2. Secondary Email Transport: Resend API
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { data, error } = await resend.emails.send({
        from: 'OMVIK CRM <onboarding@resend.dev>',
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html
      });

      if (!error) {
        console.log(`[Resend API Delivered] ID: ${data?.id} -> ${options.email}`);
        return data;
      }
      console.error('[Resend API Error]', error);
    } catch (resendErr) {
      console.error('[Resend API Failed]', resendErr.message);
    }
  }

  // 3. Fallback Development Logger
  console.log('----------------------------------------------------');
  console.log(`[DEV EMAIL LOG] To: ${options.email}`);
  console.log(`Subject: ${options.subject}`);
  console.log(`Message: ${options.message}`);
  console.log('----------------------------------------------------');
  return { simulated: true };
};

module.exports = sendEmail;
