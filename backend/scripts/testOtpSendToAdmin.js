const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const sendEmail = require('../utils/sendEmail');

async function runTest() {
  try {
    console.log('RESEND_API_KEY present:', !!process.env.RESEND_API_KEY);
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/omvik-crm';
    await mongoose.connect(mongoUri);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('Generating test OTP:', otp);

    const res = await sendEmail({
      email: 'omvikrealcon@gmail.com',
      subject: `Your 6-Digit Reset OTP: ${otp} (OMVIK CRM)`,
      message: `Password Reset OTP for OMVIK CRM: ${otp}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 24px; color: #0f172a; max-width: 480px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
          <h2 style="color: #0131B9; font-size: 20px; margin-bottom: 8px;">OMVIK CRM Password Reset OTP</h2>
          <p style="font-size: 14px; color: #475569; margin-top: 0;">Your password reset verification code is:</p>
          <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 16px; border-radius: 12px; text-align: center; margin: 20px 0;">
            <span style="font-family: monospace; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0131B9;">${otp}</span>
          </div>
          <p style="font-size: 12px; color: #64748b;">This OTP code is valid for 15 minutes.</p>
        </div>
      `
    });

    console.log('🎉 REAL RESEND EMAIL DELIVERED TO omvikrealcon@gmail.com! Result:', res);
    process.exit(0);
  } catch (err) {
    console.error('Error sending test OTP:', err);
    process.exit(1);
  }
}

runTest();
