const nodemailer = require('nodemailer');
const { Resend } = require('resend');

const sendEmail = async (options) => {
  const fromName = process.env.FROM_NAME || 'OMVIK CRM';
  const smtpUser = process.env.SMTP_USER || 'omvikrealcon@gmail.com';
  const fromHeader = `"${fromName}" <${smtpUser}>`;

  // 1. Try Gmail Direct SMTP if credentials are configured
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

      console.log(`[Gmail Direct SMTP Delivered] ID: ${info.messageId} -> ${options.email}`);
      return info;
    } catch (gmailErr) {
      console.error('[Gmail Direct SMTP Failed]', gmailErr.message);
    }
  }

  // 2. Primary Resend API (Fallback to account owner on Resend testing domain onboarding@resend.dev)
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      // Resend free tier restriction on onboarding@resend.dev requires delivering to registered account owner
      const recipient = options.email.includes('omvikrealcon@gmail.com') || options.email.includes('gmail.com')
        ? 'webdev@illusorydesignstudios.com'
        : options.email;

      const { data, error } = await resend.emails.send({
        from: 'OMVIK CRM <onboarding@resend.dev>',
        to: recipient,
        subject: options.subject,
        text: options.message,
        html: options.html
      });

      if (!error && data?.id) {
        console.log(`[Resend API Delivered Successfully] ID: ${data.id} -> ${recipient}`);
        return data;
      }
      if (error) {
        console.error('[Resend API Error]', error);
      }
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
