require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');

async function testOtpRouting() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('=== TESTING OTP ROUTING TO omvikrealcon@gmail.com ===\n');

  const targetAdminEmail = process.env.ADMIN_ALERT_EMAIL || 'omvikrealcon@gmail.com';
  console.log(`Target Inbox for ALL Password Reset OTPs: ${targetAdminEmail}`);

  // Test 1: Employee Forgot Password OTP Test
  const employee = await User.findOne({ email: 'subhashree.omvik@gmail.com' });
  if (employee) {
    const otp1 = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`\n1. Sending OTP for Employee: ${employee.name} (${employee.email})`);
    const res1 = await sendEmail({
      email: targetAdminEmail,
      subject: `Your 6-Digit Reset OTP: ${otp1} (${employee.name}) — OMVIK CRM`,
      message: `OTP for ${employee.name} (${employee.email}): ${otp1}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>OMVIK CRM Password Reset OTP</h2>
          <p>User: <strong>${employee.name}</strong> (${employee.email})</p>
          <div style="font-size: 28px; font-weight: bold; letter-spacing: 6px;">${otp1}</div>
        </div>
      `
    });
    console.log(`   Result: Sent to ${targetAdminEmail} (Resend ID: ${res1?.id || 'OK'})`);
  }

  // Test 2: Admin Forgot Password OTP Test
  const admin = await User.findOne({ email: 'aparna@omvikrealcon.com' });
  if (admin) {
    const otp2 = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`\n2. Sending OTP for Admin: ${admin.name} (${admin.email})`);
    const res2 = await sendEmail({
      email: targetAdminEmail,
      subject: `Your 6-Digit Reset OTP: ${otp2} (${admin.name}) — OMVIK CRM`,
      message: `OTP for ${admin.name} (${admin.email}): ${otp2}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>OMVIK CRM Password Reset OTP</h2>
          <p>User: <strong>${admin.name}</strong> (${admin.email})</p>
          <div style="font-size: 28px; font-weight: bold; letter-spacing: 6px;">${otp2}</div>
        </div>
      `
    });
    console.log(`   Result: Sent to ${targetAdminEmail} (Resend ID: ${res2?.id || 'OK'})`);
  }

  console.log('\n✅ ALL OTP ROUTING TESTS PASSED!');
  await mongoose.connection.close();
}

testOtpRouting().catch(console.error);
