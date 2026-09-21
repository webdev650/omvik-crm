const https = require('https');
const http = require('http');

const API_BASE = 'https://omvik-crm-dy3u.onrender.com/api';

function request(url, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.request({
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname + u.search,
      method,
      headers: { 'Content-Type': 'application/json', ...headers }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runLiveOtpTest() {
  console.log('=== END-TO-END LIVE OTP PASSWORD RESET & LOGIN TEST ===\n');

  const email = 'subhashree.omvik@gmail.com';
  const newPassword = 'Subhashree@2026!';

  // STEP 1: Request OTP
  console.log(`1. Requesting 6-Digit OTP for ${email}...`);
  const step1 = await request(`${API_BASE}/auth/forgot-password`, 'POST', { identifier: email });
  console.log('   Status:', step1.status);
  console.log('   Response:', step1.data.message);

  if (step1.status !== 200 || !step1.data.success) {
    console.error('❌ Step 1 Failed!');
    process.exit(1);
  }

  // STEP 2: Query DB directly for generated OTP code
  const mongoose = require('mongoose');
  require('dotenv').config();
  await mongoose.connect(process.env.MONGO_URI);

  const PasswordResetOTP = require('../models/PasswordResetOTP');
  const otpDoc = await PasswordResetOTP.findOne({ used: false }).sort({ createdAt: -1 });

  if (!otpDoc) {
    console.error('❌ Step 2 Failed: OTP document not found in MongoDB!');
    process.exit(1);
  }

  const otpCode = otpDoc.otpCode;
  console.log(`\n2. Retrieved Generated 6-Digit OTP from DB: [ ${otpCode} ]`);

  // STEP 3: Verify OTP code & get resetToken
  console.log(`\n3. Verifying OTP Code ${otpCode} via /api/auth/verify-otp...`);
  const step3 = await request(`${API_BASE}/auth/verify-otp`, 'POST', { identifier: email, otpCode });
  console.log('   Status:', step3.status);
  console.log('   Response:', step3.data.message);

  if (step3.status !== 200 || !step3.data.resetToken) {
    console.error('❌ Step 3 Failed!');
    process.exit(1);
  }

  const resetToken = step3.data.resetToken;
  console.log('   ResetToken Obtained:', resetToken.substring(0, 25) + '...');

  // STEP 4: Set New Password using resetToken
  console.log(`\n4. Setting New Password '${newPassword}' via /api/auth/reset-with-token...`);
  const step4 = await request(`${API_BASE}/auth/reset-with-token`, 'POST', { resetToken, newPassword });
  console.log('   Status:', step4.status);
  console.log('   Response:', step4.data.message);

  if (step4.status !== 200 || !step4.data.success) {
    console.error('❌ Step 4 Failed!');
    process.exit(1);
  }

  // STEP 5: Perform actual login with the new password
  console.log(`\n5. Logging in with new password '${newPassword}' via /api/auth/login...`);
  const step5 = await request(`${API_BASE}/auth/login`, 'POST', { email, password: newPassword });
  console.log('   Status:', step5.status);
  console.log('   Response User:', step5.data.user?.name, '(', step5.data.user?.role, ')');
  console.log('   Auth Token Received:', !!step5.data.token);

  if (step5.status === 200 && step5.data.success && step5.data.token) {
    console.log(`\n🎉 ALL 5 STEPS PASSED PERFECTLY! OTP reset flow & new password login verified on live production!`);
  } else {
    console.error('❌ Step 5 Failed!');
  }

  await mongoose.disconnect();
}

runLiveOtpTest().catch(err => {
  console.error('Fatal Test Error:', err);
  process.exit(1);
});
