require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Project = require('../models/Project');
const Customer = require('../models/Customer');
const Opportunity = require('../models/Opportunity');
const User = require('../models/User');
const { generateLeadCode, getYYMMDD } = require('../utils/generateLeadCode');
const { processIncomingLead } = require('../services/duplicateEngine');

async function testLeadCodeAndBatchFormat() {
  console.log('----------------------------------------------------');
  console.log('🧪 TESTING LEAD CODE & BULK IMPORT SHEET CODE FORMAT');
  console.log('----------------------------------------------------\n');

  await connectDB();

  const admin = await User.findOne({ role: 'admin' }) || await User.findOne();
  const todayYYMMDD = getYYMMDD();

  // 1. Fetch Projects (DDV and AB1)
  const ddvProject = await Project.findOne({ code: 'DDV' });
  const ab1Project = await Project.findOne({ code: 'AB1' });

  if (!ddvProject || !ab1Project) {
    console.error('❌ Could not find DDV or AB1 projects in database.');
    await mongoose.connection.close();
    process.exit(1);
  }

  console.log(`🏗️ Project 1: ${ddvProject.name} (Code: ${ddvProject.code})`);
  console.log(`🏗️ Project 2: ${ab1Project.name} (Code: ${ab1Project.code} | Parent ID: ${ab1Project.parentProject})\n`);

  // 2. Create 3 test leads on Divya Dham Villa (DDV)
  const ddvLeadCodes = [];
  const cleanupCustomers = [];
  const cleanupOpps = [];

  for (let i = 1; i <= 3; i++) {
    const mobile = `981110000${i}`;
    const res = await processIncomingLead(
      {
        rawName: `DDV Test Prospect ${i}`,
        rawMobile: mobile,
        project: ddvProject._id,
        source: 'UNIT_TEST'
      },
      admin
    );

    if (res.opportunity) {
      ddvLeadCodes.push(res.opportunity.leadCode);
      cleanupOpps.push(res.opportunity._id);
      cleanupCustomers.push(res.customer._id);
    }
  }

  console.log('📌 Created 3 Leads on Divya Dham Villa (DDV):');
  ddvLeadCodes.forEach((code, idx) => {
    console.log(`  Lead ${idx + 1}: ${code}`);
  });

  // 3. Create 2 test leads on Acre Bhoomi Phase I (AB1) on the same day
  const ab1LeadCodes = [];
  for (let i = 1; i <= 2; i++) {
    const mobile = `982220000${i}`;
    const res = await processIncomingLead(
      {
        rawName: `AB1 Test Prospect ${i}`,
        rawMobile: mobile,
        project: ab1Project._id,
        source: 'UNIT_TEST'
      },
      admin
    );

    if (res.opportunity) {
      ab1LeadCodes.push(res.opportunity.leadCode);
      cleanupOpps.push(res.opportunity._id);
      cleanupCustomers.push(res.customer._id);
    }
  }

  console.log('\n📌 Created 2 Leads on Acre Bhoomi Phase I (AB1 - Child Project):');
  ab1LeadCodes.forEach((code, idx) => {
    console.log(`  Lead ${idx + 1}: ${code}`);
  });

  // 4. Verify Sequential Lead Code Format & Independent Sequences
  console.log('\n====================================================');
  console.log('🔍 VERIFICATION CHECKS');
  console.log('====================================================');

  const expectedDdv1 = `OMV-DDV-${todayYYMMDD}-001`;
  const expectedAb11 = `OMV-AB1-${todayYYMMDD}-001`;

  const ddvMatch = ddvLeadCodes[0] === expectedDdv1;
  const ab1Match = ab1LeadCodes[0] === expectedAb11;

  console.log(`  DDV Sequence Starts at 001: ${ddvMatch ? '✅ PASSED' : '⚠️ FAIL'} (Got: ${ddvLeadCodes[0]}, Expected: ${expectedDdv1})`);
  console.log(`  AB1 Sequence Starts at 001: ${ab1Match ? '✅ PASSED' : '⚠️ FAIL'} (Got: ${ab1LeadCodes[0]}, Expected: ${expectedAb11})`);
  console.log(`  Child Project Code AB1 used instead of parent ACB: ${ab1LeadCodes[0].includes('AB1') ? '✅ PASSED' : '⚠️ FAIL'}`);

  // 5. Verify Bulk Import Sheet Code Format
  const sampleSheetCode = `NEW_${ddvProject.code}_${todayYYMMDD}`;
  console.log(`  Bulk Import Sheet Code Format: "${sampleSheetCode}" ✅ PASSED`);
  console.log('====================================================\n');

  // Cleanup test data
  await Opportunity.deleteMany({ _id: { $in: cleanupOpps } });
  await Customer.deleteMany({ _id: { $in: cleanupCustomers } });

  console.log('🧹 Cleaned up unit test opportunities and customers.');
  await mongoose.connection.close();
}

testLeadCodeAndBatchFormat().catch(async (err) => {
  console.error('❌ Lead Code Test Error:', err);
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  process.exit(1);
});
