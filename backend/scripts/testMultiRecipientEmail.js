const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const sendEmail = require('../utils/sendEmail');

async function testMultiRecipients() {
  console.log('=== MULTI-RECIPIENT EMAIL DELIVERY TEST ===\n');

  const recipients = [
    'omvikrealcon@gmail.com',
    'subhashree.omvik@gmail.com',
    'ashalata.omvik@gmail.com',
    'sruti.omvik@gmail.com'
  ];

  for (const recipient of recipients) {
    console.log(`\n------------------------------------------------`);
    console.log(`Sending test OTP to: ${recipient}`);
    try {
      const result = await sendEmail({
        email: recipient,
        subject: `OMVIK CRM Test OTP to ${recipient}`,
        message: `Your verification OTP is 123456 for ${recipient}`,
        html: `<h3>Your OTP is 123456</h3><p>Recipient: ${recipient}</p>`
      });
      console.log(`Result for ${recipient}:`, result);
    } catch (err) {
      console.error(`Error for ${recipient}:`, err.message);
    }
  }

  console.log('\n================================================\n');
}

testMultiRecipients();
