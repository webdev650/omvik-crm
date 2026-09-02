const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { Resend } = require('resend');

async function testFromFormats() {
  const resend = new Resend(process.env.RESEND_API_KEY);

  console.log('--- TEST 1: from = "OMVIK CRM <onboarding@resend.dev>" ---');
  try {
    const res1 = await resend.emails.send({
      from: 'OMVIK CRM <onboarding@resend.dev>',
      to: 'omvikrealcon@gmail.com',
      subject: 'Test 1: With Display Name',
      html: '<p>Test 1</p>'
    });
    console.log('Test 1 Result:', res1);
  } catch (e) {
    console.error('Test 1 Error:', e);
  }

  console.log('\n--- TEST 2: from = "onboarding@resend.dev" ---');
  try {
    const res2 = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'omvikrealcon@gmail.com',
      subject: 'Test 2: Raw Email Only',
      html: '<p>Test 2</p>'
    });
    console.log('Test 2 Result:', res2);
  } catch (e) {
    console.error('Test 2 Error:', e);
  }
}

testFromFormats();
