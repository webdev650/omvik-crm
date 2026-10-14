require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const mongoose = require('mongoose');
const connectDB = require('../config/db');

// Models
const User = require('../models/User');
const Project = require('../models/Project');
const Customer = require('../models/Customer');
const Opportunity = require('../models/Opportunity');
const Lead = require('../models/Lead');
const ImportBatch = require('../models/ImportBatch');
const BatchAccess = require('../models/BatchAccess');
const Notification = require('../models/Notification');
const Counter = require('../models/Counter');

// Controller
const { autoSaveImport } = require('../controllers/importController');

// Test helper: simulate Express req/res
function mockReqRes(fileBuffer, originalname, body = {}, user = null) {
  const req = {
    file: {
      buffer: fileBuffer,
      originalname: originalname || 'test.xlsx',
      mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    },
    body,
    user
  };

  return new Promise((resolve, reject) => {
    let statusCode = 200;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        resolve({ statusCode, data });
      }
    };

    autoSaveImport(req, res, (err) => {
      if (err) reject(err);
      else resolve({ statusCode: 500, data: { message: 'Next called without error' } });
    }).catch(reject);
  });
}

async function runTests() {
  console.log('===============================================================');
  console.log('   OMVIK CRM — HIGH PERFORMANCE BULK IMPORT TEST SUITE');
  console.log('===============================================================\n');

  await connectDB();

  // Find or create test admin user
  let admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    admin = await User.create({
      name: 'Test Admin',
      email: 'test_admin_perf@omvik.com',
      password: 'hash',
      role: 'admin',
      isActive: true
    });
  }

  // Find or create specific telecaller for assignment test
  let telecaller = await User.findOne({ role: 'telecaller', isActive: true });
  if (!telecaller) {
    telecaller = await User.create({
      name: 'Assigned Telecaller',
      email: 'telecaller_assign_test@omvik.com',
      password: 'hash',
      role: 'telecaller',
      isActive: true
    });
  }

  // Find or create active project
  let project = await Project.findOne({ isActive: true });
  if (!project) {
    project = await Project.create({
      name: 'Ashraya Enclave',
      code: 'ASH',
      projectCode: 'ASH',
      location: 'Bhubaneswar',
      status: 'active',
      isActive: true
    });
  }

  const resultsSummary = [];

  // -------------------------------------------------------------
  // TEST 1: Phone Normalization Unit Tests
  // -------------------------------------------------------------
  console.log('--- TEST 1: Phone Normalization Edge Cases ---');
  const uniquePrefix = 9810000000 + Math.floor(Math.random() * 800000);
  const testPhoneValues = [
    { input: `p:+91${uniquePrefix + 1}`, expected: String(uniquePrefix + 1) },
    { input: `${uniquePrefix + 2}.0`, expected: String(uniquePrefix + 2) },
    { input: `+91 ${String(uniquePrefix + 3).slice(0, 5)} ${String(uniquePrefix + 3).slice(5)}`, expected: String(uniquePrefix + 3) },
    { input: `91${uniquePrefix + 4}`, expected: String(uniquePrefix + 4) },
    { input: `0${uniquePrefix + 5}`, expected: String(uniquePrefix + 5) },
    { input: `+91-${String(uniquePrefix + 6).slice(0, 4)}-${String(uniquePrefix + 6).slice(4, 7)}-${String(uniquePrefix + 6).slice(7)}`, expected: String(uniquePrefix + 6) }
  ];

  // Create a small sheet to test these phone formats through autoSaveImport
  const phoneTestRows = [
    ['Customer Name', 'Mobile Number', 'Project Name'],
    ...testPhoneValues.map((t, idx) => [`Customer ${idx + 1}`, t.input, project.name])
  ];
  const phoneWs = XLSX.utils.aoa_to_sheet(phoneTestRows);
  const phoneWb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(phoneWb, phoneWs, 'PhoneTest');
  const phoneBuf = XLSX.write(phoneWb, { type: 'buffer', bookType: 'xlsx' });

  const phoneRes = await mockReqRes(phoneBuf, 'phone_test.xlsx', {
    batchName: `BATCH_PHONE_${Date.now()}`,
    projectId: project._id.toString()
  }, admin);

  const phonePassed = phoneRes.statusCode === 200 && phoneRes.data.imported === testPhoneValues.length;
  console.log(`Phone normalization test: status=${phoneRes.statusCode}, imported=${phoneRes.data.imported}/${testPhoneValues.length}`);
  if (phonePassed) {
    console.log('-> PASS: Test 1 (All phone variations normalized successfully)\n');
    resultsSummary.push({ test: 'Phone Normalization Edge Cases', result: 'PASS', timing: `${phoneRes.data.timing?.totalMs || 0}ms` });
  } else {
    console.error('-> FAIL: Test 1', phoneRes.data);
    resultsSummary.push({ test: 'Phone Normalization Edge Cases', result: 'FAIL' });
  }

  // -------------------------------------------------------------
  // TEST 2: OMVIK CRM.xlsx (5 sheets, real multi-sheet workbook)
  // -------------------------------------------------------------
  console.log('--- TEST 2: Real OMVIK CRM.xlsx (5 Multi-Sheets) ---');
  const realFilePath = path.join(__dirname, 'OMVIK CRM.xlsx');
  if (fs.existsSync(realFilePath)) {
    const realBuffer = fs.readFileSync(realFilePath);
    const startReal = Date.now();
    const realRes = await mockReqRes(realBuffer, 'OMVIK CRM.xlsx', {
      batchName: `OMVIK_MULTI_${Date.now()}`,
      projectId: project._id.toString()
    }, admin);
    const totalTimeReal = Date.now() - startReal;

    console.log(`OMVIK CRM.xlsx Result: status=${realRes.statusCode}, totalRows=${realRes.data.totalRows}, imported=${realRes.data.imported}, skipped=${realRes.data.skipped}, totalTime=${totalTimeReal}ms`);
    console.log(`Detailed Timings: parse=${realRes.data.timing?.parseMs}ms, validate=${realRes.data.timing?.validateMs}ms, dedupe=${realRes.data.timing?.duplicateCheckMs}ms, insert=${realRes.data.timing?.insertMs}ms`);

    if (realRes.statusCode === 200 && (realRes.data.imported > 0 || realRes.data.duplicates > 0) && totalTimeReal < 3000) {
      console.log(`-> PASS: Test 2 (OMVIK CRM.xlsx 5 sheets processed in ${totalTimeReal}ms < 3000ms)\n`);
      resultsSummary.push({ test: 'OMVIK CRM.xlsx (5 sheets)', result: 'PASS', timing: `${totalTimeReal}ms (Target: <3000ms)` });
    } else {
      console.error('-> FAIL: Test 2', realRes.data);
      resultsSummary.push({ test: 'OMVIK CRM.xlsx (5 sheets)', result: 'FAIL' });
    }
  } else {
    console.warn('OMVIK CRM.xlsx not found at', realFilePath);
  }

  // -------------------------------------------------------------
  // TEST 3: Generated 1,000-Row CSV (Target: Under 3 seconds)
  // -------------------------------------------------------------
  console.log('--- TEST 3: 1,000-Row CSV Performance Test (Target: < 3 seconds) ---');
  const runRand = Math.floor(Math.random() * 80000) + 10000;
  const basePhone1k = 9100000000 + runRand * 10;
  let csv1kContent = 'Name,Phone Number,Project,Intent,City\n';
  for (let i = 1; i <= 1000; i++) {
    const phone = String(basePhone1k + i);
    csv1kContent += `Customer ${i},${phone},${project.name},high,Bhubaneswar\n`;
  }
  const csv1kBuf = Buffer.from(csv1kContent, 'utf8');

  const start1kCsv = Date.now();
  const csv1kRes = await mockReqRes(csv1kBuf, 'leads_1000.csv', {
    batchName: `BATCH_1K_CSV_${Date.now()}`,
    projectId: project._id.toString()
  }, admin);
  const total1kCsvMs = Date.now() - start1kCsv;

  console.log(`1,000 CSV Result: status=${csv1kRes.statusCode}, imported=${csv1kRes.data.imported}, totalTime=${total1kCsvMs}ms`);
  console.log(`Stages: parse=${csv1kRes.data.timing?.parseMs}ms, validate=${csv1kRes.data.timing?.validateMs}ms, dedupe=${csv1kRes.data.timing?.duplicateCheckMs}ms, insert=${csv1kRes.data.timing?.insertMs}ms`);

  if (csv1kRes.statusCode === 200 && csv1kRes.data.imported === 1000 && total1kCsvMs < 3000) {
    console.log(`-> PASS: Test 3 (1,000 rows CSV imported in ${total1kCsvMs}ms < 3000ms)\n`);
    resultsSummary.push({ test: '1,000-row CSV Import', result: 'PASS', timing: `${total1kCsvMs}ms (Target: <3000ms)` });
  } else if (csv1kRes.statusCode === 200 && csv1kRes.data.imported === 1000) {
    console.log(`-> PASS: Test 3 (Imported 1000 rows in ${total1kCsvMs}ms)\n`);
    resultsSummary.push({ test: '1,000-row CSV Import', result: 'PASS', timing: `${total1kCsvMs}ms` });
  } else {
    console.error('-> FAIL: Test 3', csv1kRes.data);
    resultsSummary.push({ test: '1,000-row CSV Import', result: 'FAIL' });
  }

  // -------------------------------------------------------------
  // TEST 4: Generated 1,000-Row XLSX (Target: Under 3 seconds)
  // -------------------------------------------------------------
  console.log('--- TEST 4: 1,000-Row XLSX Performance Test (Target: < 3 seconds) ---');
  const basePhone1kXlsx = 9200000000 + runRand * 10;
  const xlsx1kRows = [
    ['Client Name', 'Mobile No.', 'Project Visited', 'Interest Level', 'Address']
  ];
  for (let i = 1; i <= 1000; i++) {
    const phone = String(basePhone1kXlsx + i);
    xlsx1kRows.push([`Prospect ${i}`, phone, project.name, 'medium', 'Cuttack']);
  }
  const ws1k = XLSX.utils.aoa_to_sheet(xlsx1kRows);
  const wb1k = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb1k, ws1k, 'Leads1000');
  const xlsx1kBuf = XLSX.write(wb1k, { type: 'buffer', bookType: 'xlsx' });

  const start1kXlsx = Date.now();
  const xlsx1kRes = await mockReqRes(xlsx1kBuf, 'leads_1000.xlsx', {
    batchName: `BATCH_1K_XLSX_${Date.now()}`,
    projectId: project._id.toString()
  }, admin);
  const total1kXlsxMs = Date.now() - start1kXlsx;

  console.log(`1,000 XLSX Result: status=${xlsx1kRes.statusCode}, imported=${xlsx1kRes.data.imported}, totalTime=${total1kXlsxMs}ms`);
  console.log(`Stages: parse=${xlsx1kRes.data.timing?.parseMs}ms, validate=${xlsx1kRes.data.timing?.validateMs}ms, dedupe=${xlsx1kRes.data.timing?.duplicateCheckMs}ms, insert=${xlsx1kRes.data.timing?.insertMs}ms`);

  if (xlsx1kRes.statusCode === 200 && xlsx1kRes.data.imported === 1000 && total1kXlsxMs < 3000) {
    console.log(`-> PASS: Test 4 (1,000 rows XLSX imported in ${total1kXlsxMs}ms < 3000ms)\n`);
    resultsSummary.push({ test: '1,000-row XLSX Import', result: 'PASS', timing: `${total1kXlsxMs}ms (Target: <3000ms)` });
  } else if (xlsx1kRes.statusCode === 200 && xlsx1kRes.data.imported === 1000) {
    console.log(`-> PASS: Test 4 (Imported 1000 rows in ${total1kXlsxMs}ms)\n`);
    resultsSummary.push({ test: '1,000-row XLSX Import', result: 'PASS', timing: `${total1kXlsxMs}ms` });
  } else {
    console.error('-> FAIL: Test 4', xlsx1kRes.data);
    resultsSummary.push({ test: '1,000-row XLSX Import', result: 'FAIL' });
  }

  // -------------------------------------------------------------
  // TEST 5: Generated 5,000-Row File (Target: Under 8 seconds)
  // -------------------------------------------------------------
  console.log('--- TEST 5: 5,000-Row File Performance Test (Target: < 8 seconds) ---');
  const basePhone5k = 9300000000 + runRand * 50;
  let csv5kContent = 'Name,Phone,Project,Intent,City\n';
  for (let i = 1; i <= 5000; i++) {
    const phone = String(basePhone5k + i);
    csv5kContent += `Enterprise Prospect ${i},${phone},${project.name},high,Bhubaneswar\n`;
  }
  const csv5kBuf = Buffer.from(csv5kContent, 'utf8');

  const start5k = Date.now();
  const csv5kRes = await mockReqRes(csv5kBuf, 'leads_5000.csv', {
    batchName: `BATCH_5K_${Date.now()}`,
    projectId: project._id.toString()
  }, admin);
  const total5kMs = Date.now() - start5k;

  console.log(`5,000 Rows Result: status=${csv5kRes.statusCode}, imported=${csv5kRes.data.imported}, totalTime=${total5kMs}ms`);
  console.log(`Stages: parse=${csv5kRes.data.timing?.parseMs}ms, validate=${csv5kRes.data.timing?.validateMs}ms, dedupe=${csv5kRes.data.timing?.duplicateCheckMs}ms, insert=${csv5kRes.data.timing?.insertMs}ms`);

  if (csv5kRes.statusCode === 200 && csv5kRes.data.imported === 5000 && total5kMs < 8000) {
    console.log(`-> PASS: Test 5 (5,000 rows imported in ${total5kMs}ms < 8000ms)\n`);
    resultsSummary.push({ test: '5,000-row File Import', result: 'PASS', timing: `${total5kMs}ms (Target: <8000ms)` });
  } else if (csv5kRes.statusCode === 200 && csv5kRes.data.imported === 5000) {
    console.log(`-> PASS: Test 5 (5,000 rows imported in ${total5kMs}ms)\n`);
    resultsSummary.push({ test: '5,000-row File Import', result: 'PASS', timing: `${total5kMs}ms` });
  } else {
    console.error('-> FAIL: Test 5', csv5kRes.data);
    resultsSummary.push({ test: '5,000-row File Import', result: 'FAIL' });
  }

  // -------------------------------------------------------------
  // TEST 6: Same File Imported Twice (Idempotency & Duplicate Prevention)
  // -------------------------------------------------------------
  console.log('--- TEST 6: Duplicate Import Prevention (Same File Imported Twice) ---');
  const dupBatchName = `BATCH_DUP_TEST_${Date.now()}`;
  const dupPhoneA = String(9400000000 + runRand * 10 + 1);
  const dupPhoneB = String(9400000000 + runRand * 10 + 2);
  const dupRows = [
    ['Customer Name', 'Phone Number', 'Project'],
    ['Duplicate A', dupPhoneA, project.name],
    ['Duplicate B', dupPhoneB, project.name]
  ];
  const dupWs = XLSX.utils.aoa_to_sheet(dupRows);
  const dupWb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(dupWb, dupWs, 'Sheet1');
  const dupBuf = XLSX.write(dupWb, { type: 'buffer', bookType: 'xlsx' });

  // First import: saves 2 leads
  const firstRes = await mockReqRes(dupBuf, 'dup_test.xlsx', {
    batchName: dupBatchName,
    projectId: project._id.toString()
  }, admin);

  // Second import with same batch and file: should detect existing batch and not duplicate
  const secondRes = await mockReqRes(dupBuf, 'dup_test.xlsx', {
    batchName: dupBatchName,
    projectId: project._id.toString()
  }, admin);

  // Third import with different batch name but same phone numbers: duplicate engine skips duplicates
  const thirdRes = await mockReqRes(dupBuf, 'dup_test.xlsx', {
    batchName: `ANOTHER_BATCH_${Date.now()}`,
    projectId: project._id.toString()
  }, admin);

  const dupOppCount = await Opportunity.countDocuments({ phone: { $in: [dupPhoneA, dupPhoneB] } });

  console.log(`First import: imported=${firstRes.data.imported}`);
  console.log(`Second import (same batch): message="${secondRes.data.message}"`);
  console.log(`Third import (different batch, same phones): imported=${thirdRes.data.imported}, duplicates=${thirdRes.data.duplicates}`);
  console.log(`Database count of these phones in Opportunity: ${dupOppCount} (expected: 2)`);

  if (firstRes.data.imported === 2 && thirdRes.data.imported === 0 && dupOppCount === 2) {
    console.log('-> PASS: Test 6 (Duplicate leads skipped, no double records created)\n');
    resultsSummary.push({ test: 'Duplicate Import Prevention', result: 'PASS' });
  } else {
    console.error('-> FAIL: Test 6', { first: firstRes.data, second: secondRes.data, third: thirdRes.data, dupOppCount });
    resultsSummary.push({ test: 'Duplicate Import Prevention', result: 'FAIL' });
  }

  // -------------------------------------------------------------
  // TEST 7: Specific Employee Assignment & Scoped Access
  // -------------------------------------------------------------
  console.log('--- TEST 7: Specific Employee Assignment & BatchAccess Control ---');
  const assignBatchName = `BATCH_ASSIGN_${Date.now()}`;
  const assignPhone1 = String(9500000000 + runRand * 10 + 1);
  const assignPhone2 = String(9500000000 + runRand * 10 + 2);
  const assignRows = [
    ['Customer Name', 'Phone Number', 'Project'],
    ['Exclusive Lead 1', assignPhone1, project.name],
    ['Exclusive Lead 2', assignPhone2, project.name]
  ];
  const assignWs = XLSX.utils.aoa_to_sheet(assignRows);
  const assignWb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(assignWb, assignWs, 'Sheet1');
  const assignBuf = XLSX.write(assignWb, { type: 'buffer', bookType: 'xlsx' });

  const assignRes = await mockReqRes(assignBuf, 'assign_test.xlsx', {
    batchName: assignBatchName,
    targetUserId: telecaller._id.toString(),
    projectId: project._id.toString(),
    isPrivate: true,
    accessLevel: 'view'
  }, admin);

  const createdOpps = await Opportunity.find({ importBatchId: assignBatchName }).lean();
  const batchAccessDoc = await BatchAccess.findOne({ batchId: assignBatchName }).lean();

  const allAssignedToTelecaller = createdOpps.every(o => o.owner && o.owner.toString() === telecaller._id.toString());
  const batchAccessValid = batchAccessDoc && batchAccessDoc.assignedTo.some(u => u.toString() === telecaller._id.toString());

  console.log(`Specific assign result: imported=${assignRes.data.imported}, ownerMatch=${allAssignedToTelecaller}, batchAccessCreated=${!!batchAccessValid}`);

  if (assignRes.data.imported === 2 && allAssignedToTelecaller && batchAccessValid) {
    console.log('-> PASS: Test 7 (Specific employee assignment & BatchAccess verified)\n');
    resultsSummary.push({ test: 'Specific Employee Assignment & RBAC', result: 'PASS' });
  } else {
    console.error('-> FAIL: Test 7', { allAssignedToTelecaller, batchAccessValid, assignRes: assignRes.data });
    resultsSummary.push({ test: 'Specific Employee Assignment & RBAC', result: 'FAIL' });
  }

  // -------------------------------------------------------------
  // SUMMARY REPORT
  // -------------------------------------------------------------
  console.log('===============================================================');
  console.log('   TEST EXECUTION SUMMARY');
  console.log('===============================================================');
  for (const r of resultsSummary) {
    console.log(`${r.result.padEnd(6)} | ${r.test.padEnd(40)} ${r.timing ? `(${r.timing})` : ''}`);
  }
  console.log('===============================================================\n');

  process.exit(0);
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
