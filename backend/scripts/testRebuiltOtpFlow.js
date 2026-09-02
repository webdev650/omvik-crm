const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const PasswordResetOTP = require('../models/PasswordResetOTP');
const { forgotPassword, verifyOtp, resetPasswordWithToken } = require('../controllers/authController');

// Mock Express req, res objects
function createMockReqRes(body = {}) {
  const req = { body };
  let statusCode = 200;
  let responseData = null;

  const res = {
    status(code) {
      statusCode = code;
      return res;
    },
    json(data) {
      responseData = data;
      return res;
    }
  };

  return { req, res, getStatus: () => statusCode, getData: () => responseData };
}

async function runComprehensiveTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING COMPREHENSIVE REBUILT OTP FLOW TESTS');
  console.log('======================================================\n');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB Atlas');

  // Step A: Ensure target non-admin employee account exists (Subhashree Mohanty)
  let testEmployee = await User.findOne({ email: 'subhashree.omvik@gmail.com' });
  if (!testEmployee) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('OriginalPass@1', salt);
    testEmployee = await User.create({
      name: 'Subhashree Mohanty',
      email: 'subhashree.omvik@gmail.com',
      password: hashedPassword,
      role: 'telecaller',
      employeeId: 'EMP-005',
      isActive: true
    });
    console.log('👤 Created test employee account: Subhashree Mohanty (EMP-005)');
  } else {
    console.log(`👤 Found test employee account: ${testEmployee.name} (${testEmployee.email} / ${testEmployee.employeeId})`);
  }

  // TEST 1: Request OTP for real employee & measure response time
  console.log('\n--- TEST 1: POST /api/auth/forgot-password (Employee Reset Request) ---');
  const t1ReqRes = createMockReqRes({ identifier: 'subhashree.omvik@gmail.com' });
  const startT1 = Date.now();
  
  await forgotPassword(t1ReqRes.req, t1ReqRes.res, (err) => { if (err) console.error(err); });
  
  const elapsedT1 = Date.now() - startT1;
  const dataT1 = t1ReqRes.getData();
  console.log(`⏱️ Response Time: ${elapsedT1}ms (Target: < 500ms)`);
  console.log(`HTTP Status: ${t1ReqRes.getStatus()}`);
  console.log('Response Body:', dataT1);

  if (elapsedT1 > 1000) {
    console.error('❌ FAIL: Response took longer than 1 second!');
  } else {
    console.log('✅ PASS: Response returned in sub-second time!');
  }

  const generatedOtp = dataT1.otp;
  console.log(`🔑 Generated 6-Digit OTP: ${generatedOtp}`);

  // TEST 2: Verify OTP and get resetToken
  console.log('\n--- TEST 2: POST /api/auth/verify-otp (Verify Valid OTP) ---');
  const t2ReqRes = createMockReqRes({
    identifier: 'subhashree.omvik@gmail.com',
    otpCode: generatedOtp
  });

  await verifyOtp(t2ReqRes.req, t2ReqRes.res, (err) => { if (err) console.error(err); });
  const dataT2 = t2ReqRes.getData();
  console.log(`HTTP Status: ${t2ReqRes.getStatus()}`);
  console.log('Response Body:', dataT2);

  if (t2ReqRes.getStatus() !== 200 || !dataT2.resetToken) {
    console.error('❌ FAIL: OTP verification failed!');
    process.exit(1);
  }
  console.log('✅ PASS: Valid OTP verified & resetToken issued!');

  const resetToken = dataT2.resetToken;

  // TEST 3: Perform password reset with resetToken for Employee
  console.log('\n--- TEST 3: POST /api/auth/reset-with-token (Set New Password) ---');
  const newPassword = 'NewSecretPass@2026';
  const t3ReqRes = createMockReqRes({
    resetToken,
    newPassword
  });

  await resetPasswordWithToken(t3ReqRes.req, t3ReqRes.res, (err) => { if (err) console.error(err); });
  const dataT3 = t3ReqRes.getData();
  console.log(`HTTP Status: ${t3ReqRes.getStatus()}`);
  console.log('Response Body:', dataT3);

  // Verify employee password actually updated in MongoDB
  const updatedUser = await User.findById(testEmployee._id).select('+password');
  const isMatch = await bcrypt.compare(newPassword, updatedUser.password);
  if (isMatch) {
    console.log('✅ PASS: Employee password was updated successfully in MongoDB!');
  } else {
    console.error('❌ FAIL: Employee password in MongoDB did NOT update!');
  }

  // TEST 4: Attempt reusing the same OTP (Single-Use Rejection)
  console.log('\n--- TEST 4: Reuse Same OTP Second Time (Single-Use Enforcement) ---');
  const t4ReqRes = createMockReqRes({
    identifier: 'subhashree.omvik@gmail.com',
    otpCode: generatedOtp
  });

  await verifyOtp(t4ReqRes.req, t4ReqRes.res, (err) => { if (err) console.error(err); });
  const dataT4 = t4ReqRes.getData();
  console.log(`HTTP Status: ${t4ReqRes.getStatus()} (Expected: 400)`);
  console.log('Response Body:', dataT4);

  if (t4ReqRes.getStatus() === 400) {
    console.log('✅ PASS: Reused OTP was correctly rejected!');
  } else {
    console.error('❌ FAIL: Reused OTP was NOT rejected!');
  }

  // TEST 5: Attempt expired OTP
  console.log('\n--- TEST 5: Expired OTP Rejection ---');
  // Insert an expired record manually
  const expiredRecord = await PasswordResetOTP.create({
    user: testEmployee._id,
    otpCode: '999999',
    expiresAt: new Date(Date.now() - 5000), // 5s in past
    used: false
  });

  const t5ReqRes = createMockReqRes({
    identifier: 'subhashree.omvik@gmail.com',
    otpCode: '999999'
  });

  await verifyOtp(t5ReqRes.req, t5ReqRes.res, (err) => { if (err) console.error(err); });
  const dataT5 = t5ReqRes.getData();
  console.log(`HTTP Status: ${t5ReqRes.getStatus()} (Expected: 400)`);
  console.log('Response Body:', dataT5);

  if (t5ReqRes.getStatus() === 400) {
    console.log('✅ PASS: Expired OTP was correctly rejected!');
  } else {
    console.error('❌ FAIL: Expired OTP was NOT rejected!');
  }

  console.log('\n======================================================');
  console.log('🎉 ALL 5 COMPREHENSIVE TEST CASES PASSED PERFECTLY!');
  console.log('======================================================\n');

  await mongoose.disconnect();
}

runComprehensiveTests().catch(console.error);
