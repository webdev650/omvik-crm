const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');
const User = require('../models/User');

async function dispatchOtp() {
  await mongoose.connect(process.env.MONGO_URI);

  // Generate 6-digit numeric OTP code
  const freshOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedOtp = crypto.createHash('sha256').update(freshOtp).digest('hex');

  // Find Aparna / omvikrealcon Super Admin user
  let user = await User.findOne({ email: 'aparna@omvikrealcon.com' });
  if (!user) {
    user = await User.findOne({ role: 'super_admin' });
  }

  if (!user) {
    console.error('Super Admin user not found');
    process.exit(1);
  }

  user.resetPasswordTokenHash = hashedOtp;
  user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 60 minutes expiry
  await user.save({ validateBeforeSave: false });

  console.log(`\n======================================================`);
  console.log(`🔑 [FRESH ACTIVE OTP GENERATED FOR CLIENT]`);
  console.log(`User: ${user.name} (${user.email})`);
  console.log(`Target Email: omvikrealcon@gmail.com`);
  console.log(`6-DIGIT OTP CODE: ${freshOtp}`);
  console.log(`======================================================\n`);

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #0f172a; max-width: 480px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <h2 style="color: #0131B9; font-size: 20px; margin-bottom: 8px;">OMVIK CRM Password Reset OTP</h2>
      <p style="font-size: 14px; color: #475569; margin-top: 0;">Password Reset OTP requested for user: <strong>${user.name}</strong> (${user.email})</p>
      <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 16px; border-radius: 12px; text-align: center; margin: 20px 0;">
        <span style="font-family: monospace; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0131B9;">${freshOtp}</span>
      </div>
      <p style="font-size: 12px; color: #64748b;">This OTP code is valid for 60 minutes. Use this code to reset your password.</p>
    </div>
  `;

  const sendResult = await sendEmail({
    email: 'omvikrealcon@gmail.com',
    subject: `🔥 Password Reset OTP Code: ${freshOtp} — OMVIK CRM`,
    message: `Your OMVIK CRM password reset verification OTP code is: ${freshOtp}`,
    html
  });

  console.log('Resend Delivery Status:', sendResult);

  await mongoose.disconnect();
}

dispatchOtp().catch(console.error);
