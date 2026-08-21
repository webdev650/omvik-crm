require('dotenv').config();
const { Resend } = require('resend');

async function testResend() {
  console.log('=== TESTING RESEND API DELIVERABILITY ===\n');
  console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'Present' : 'Missing');

  const resend = new Resend(process.env.RESEND_API_KEY);

  // Test 1: Send to webdev@illusorydesignstudios.com (Resend Account Owner)
  try {
    const res1 = await resend.emails.send({
      from: 'OMVIK CRM <onboarding@resend.dev>',
      to: 'webdev@illusorydesignstudios.com',
      subject: 'Resend Test to Account Owner',
      html: '<h1>Resend Test</h1><p>Testing delivery to account owner.</p>'
    });
    console.log('Test 1 (Account Owner):', res1);
  } catch (err1) {
    console.error('Test 1 Failed:', err1);
  }

  // Test 2: Send to omvikrealcon@gmail.com
  try {
    const res2 = await resend.emails.send({
      from: 'OMVIK CRM <onboarding@resend.dev>',
      to: 'omvikrealcon@gmail.com',
      subject: 'Resend Test to omvikrealcon@gmail.com',
      html: '<h1>Resend Test</h1><p>Testing delivery to omvikrealcon@gmail.com.</p>'
    });
    console.log('Test 2 (omvikrealcon@gmail.com):', res2);
  } catch (err2) {
    console.error('Test 2 Failed:', err2);
  }
}

testResend();
