const { Resend } = require('resend');
const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  const fromName = process.env.FROM_NAME || 'OMVIK CRM';
  const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';
  const fromHeader = `${fromName} <${fromEmail}>`;

  // 1. Primary Email Transport: Resend API
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { data, error } = await resend.emails.send({
        from: fromHeader,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html
      });

      if (error) {
        console.error('[Resend Error]', error);
        throw new Error(error.message || 'Failed to send email via Resend API');
      }

      console.log(`[Resend Email Sent] ID: ${data?.id} to ${options.email}`);
      return data;
    } catch (resendErr) {
      console.error('[Resend API Delivery Failed]', resendErr.message);
      if (process.env.NODE_ENV === 'production') {
        throw resendErr;
      }
    }
  }

  // 2. Secondary Email Transport: Nodemailer SMTP
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      const info = await transporter.sendMail({
        from: fromHeader,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html
      });

      console.log(`[SMTP Email Sent] ID: ${info.messageId} to ${options.email}`);
      return info;
    } catch (smtpErr) {
      console.error('[SMTP Delivery Failed]', smtpErr.message);
      if (process.env.NODE_ENV === 'production') {
        throw smtpErr;
      }
    }
  }

  // 3. Fallback Development Logger
  console.log('----------------------------------------------------');
  console.log(`[DEV EMAIL SIMULATION] To: ${options.email}`);
  console.log(`From: ${fromHeader}`);
  console.log(`Subject: ${options.subject}`);
  console.log(`Message: ${options.message}`);
  console.log('----------------------------------------------------');
  return { simulated: true };
};

module.exports = sendEmail;
