require('dotenv').config();
const mongoose = require('mongoose');
const PasswordResetOTP = require('../models/PasswordResetOTP');
const User = require('../models/User');

async function getLatestOtp() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI missing');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  const latestOtp = await PasswordResetOTP.findOne({})
    .sort({ createdAt: -1 })
    .populate('user', 'name email employeeId');
  
  if (latestOtp) {
    console.log(JSON.stringify({
      otpCode: latestOtp.otpCode,
      used: latestOtp.used,
      user: latestOtp.user?.name,
      email: latestOtp.user?.email,
      expiresAt: latestOtp.expiresAt
    }));
  } else {
    console.log('No OTP records found in collection');
  }
  await mongoose.disconnect();
}

getLatestOtp().catch(console.error);
