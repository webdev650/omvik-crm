const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const sendEmail = require('../utils/sendEmail');
const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('../models/User');

async function sendFreshOtp() {
  await mongoose.connect(process.env.MONGO_URI);

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

  // Find Aparna / omvikrealcon user
  const user = await User.findOne({ email: 'aparna@omvikrealcon.com' });

  if (user) {
    user.resetPasswordTokenHash = hashedOtp;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    await user.save({ validateBeforeSave: false });
    console.log(`Updated user ${user.name} (${user.email}) in DB with fresh OTP hash.`);
  }

  console.log(`\n🔑 [FRESH 6-DIGIT OTP CODE]: ${otp}\n`);

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #0f172a; max-width: 480px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <h2 style="color: #0131B9; font-size: 20px; margin-bottom: 8px;">OMVIK CRM Password Reset OTP</h2>
      <p style="font-size: 14px; color: #475569;">Your 6-Digit Password Reset Verification Code:</p>
      <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 16px; border-radius: 12px; text-align: center; margin: 20px 0;">
        <span style="font-family: monospace; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0131B9;">${otp}</span>
      </div>
      <p style="font-size: 12px; color: #64748b;">This OTP code is valid for 15 minutes. Enter this code on the verification screen.</p>
    </div>
  `;

  await sendEmail({
    email: 'omvikrealcon@gmail.com',
    subject: `Your 6-Digit Reset OTP: ${otp} — OMVIK CRM`,
    message: `Your password reset verification code is: ${otp}`,
    html
  });

  await mongoose.disconnect();
}

sendFreshOtp().catch(console.error);
