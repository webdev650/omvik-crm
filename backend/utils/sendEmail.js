const { Resend } = require('resend');

const sendEmail = async (options) => {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error('[Resend Config Error] RESEND_API_KEY is missing in environment variables.');
    throw new Error('RESEND_API_KEY missing');
  }

  const resend = new Resend(apiKey);

  const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';
  const fromHeader = `OMVIK CRM <${fromEmail}>`;

  const targetRecipient = options.email;

  try {
    const { data, error } = await resend.emails.send({
      from: fromHeader,
      to: targetRecipient,
      subject: options.subject,
      text: options.message,
      html: options.html
    });

    if (error) {
      console.error('[Resend API Error]', error);
      throw new Error(error.message || 'Resend delivery failed');
    }

    console.log(`[Resend Email Delivered Direct] ID: ${data?.id} -> ${targetRecipient}`);
    return data;
  } catch (err) {
    console.error('[Resend Delivery Exception]', err.message);
    throw err;
  }
};

module.exports = sendEmail;
