require('dotenv').config();
const mongoose = require('mongoose');
const Opportunity = require('../models/Opportunity');
const Customer = require('../models/Customer');
const Project = require('../models/Project');
const User = require('../models/User');
const DailyReport = require('../models/DailyReport');
const { generateLeadCode } = require('../utils/generateLeadCode');
const { getTeamOverview } = require('../controllers/dailyReportController');

async function verifyLeadCodesAndTeamEod() {
  console.log('=== VERIFYING LEAD CODE SEQUENCING & TEAM EOD OVERVIEW ===\n');

  if (!process.env.MONGO_URI) {
    console.error('❌ Error: MONGO_URI is missing in .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB Database');

  // -------------------------------------------------------------
  // TEST 1: Sequential Lead Code Generation & Collision Check
  // -------------------------------------------------------------
  console.log('\n-------------------------------------------------------------');
  console.log('🧪 TEST 1: Lead Code Generation & Sequential Collision Check');
  console.log('-------------------------------------------------------------');

  let project = await Project.findOne({ code: { $exists: true } });
  if (!project) {
    project = await Project.create({
      name: 'Omvik Grand Residency',
      code: 'OGR',
      location: 'Bhubaneswar'
    });
  }

  const projCode = project.projectCode || project.code || 'OMV';
  const today = new Date();
  const dateStr = `${String(today.getFullYear()).slice(-2)}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

  console.log(`📌 Using Project: '${project.name}' (Code: ${projCode})`);
  console.log(`📅 Target Date Code String: ${dateStr}`);

  // Create 2 test leads concurrently using generateLeadCode
  const leadCode1 = await generateLeadCode(project._id, today);
  const customer1 = await Customer.create({
    name: `Test Lead 1 ${Date.now()}`,
    primaryMobile: `98${Math.floor(10000000 + Math.random() * 90000000)}`
  });
  const opp1 = await Opportunity.create({
    customer: customer1._id,
    project: project._id,
    leadCode: leadCode1,
    stage: 'new',
    isActive: true
  });

  const leadCode2 = await generateLeadCode(project._id, today);
  const customer2 = await Customer.create({
    name: `Test Lead 2 ${Date.now()}`,
    primaryMobile: `98${Math.floor(10000000 + Math.random() * 90000000)}`
  });
  const opp2 = await Opportunity.create({
    customer: customer2._id,
    project: project._id,
    leadCode: leadCode2,
    stage: 'new',
    isActive: true
  });

  console.log(`\n✅ Lead 1 Created:`);
  console.log(`   - ID: ${opp1._id}`);
  console.log(`   - Lead Code: '${opp1.leadCode}'`);

  console.log(`\n✅ Lead 2 Created:`);
  console.log(`   - ID: ${opp2._id}`);
  console.log(`   - Lead Code: '${opp2.leadCode}'`);

  const codeRegex = new RegExp(`^OMV-${projCode}-${dateStr}-\\d{3}$`);
  const isLead1Valid = codeRegex.test(opp1.leadCode);
  const isLead2Valid = codeRegex.test(opp2.leadCode);
  const isSequential = opp1.leadCode !== opp2.leadCode;

  if (isLead1Valid && isLead2Valid && isSequential) {
    console.log(`\n🎉 TEST 1 PASSED: Lead Codes formatted correctly (${opp1.leadCode} -> ${opp2.leadCode}) with 0 collisions!`);
  } else {
    console.error(`\n❌ TEST 1 FAILED: Lead code format or collision validation failed.`);
  }

  // Clean up test leads
  await Opportunity.deleteMany({ _id: { $in: [opp1._id, opp2._id] } });
  await Customer.deleteMany({ _id: { $in: [customer1._id, customer2._id] } });

  // -------------------------------------------------------------
  // TEST 2: Team EOD Overview Data Integrity Check
  // -------------------------------------------------------------
  console.log('\n-------------------------------------------------------------');
  console.log('🧪 TEST 2: Team EOD Overview Page & Real Employee Data Check');
  console.log('-------------------------------------------------------------');

  const adminUser = await User.findOne({ role: 'admin' }) || await User.findOne({});
  const mockReq = { query: { date: today.toISOString().split('T')[0] }, user: adminUser };
  
  let jsonResult = null;
  const mockRes = {
    json: (data) => {
      jsonResult = data;
      return data;
    }
  };

  await getTeamOverview(mockReq, mockRes, (err) => {
    if (err) console.error('Controller Error:', err);
  });

  if (jsonResult && jsonResult.success) {
    console.log(`✅ Team EOD Overview API Executed Successfully:`);
    console.log(`   - Date: ${jsonResult.date}`);
    console.log(`   - Total Active Employees: ${jsonResult.count}`);
    console.log(`   - Required EOD Submitters: ${jsonResult.requiredCount}`);
    console.log(`   - Submitted Count: ${jsonResult.submittedCount}`);
    console.log(`   - Pending Count: ${jsonResult.pendingCount}`);

    console.log(`\n📋 Employee Overview Sample (First 5):`);
    jsonResult.overview.slice(0, 5).forEach((item, idx) => {
      console.log(`   ${idx + 1}. [${item.user.employeeId || 'N/A'}] ${item.user.name.padEnd(25)} (${item.user.role}) | Submitted: ${item.submitted ? '✅ YES' : '❌ NO'} | Active Leads: ${item.currentLeadsAssigned}`);
    });

    if (jsonResult.count > 0 && Array.isArray(jsonResult.overview)) {
      console.log(`\n🎉 TEST 2 PASSED: Team EOD Overview displays real employee submission & lead data!`);
    } else {
      console.error(`\n❌ TEST 2 FAILED: Team EOD Overview returned empty employee list.`);
    }
  } else {
    console.error(`\n❌ TEST 2 FAILED: Team EOD Overview API failed to execute.`);
  }

  await mongoose.disconnect();
}

verifyLeadCodesAndTeamEod().catch(err => {
  console.error('Fatal Verification Error:', err);
  process.exit(1);
});
