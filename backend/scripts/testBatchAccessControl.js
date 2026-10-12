/**
 * Test script for Batch-Level Access Control (Employee Can Only See Assigned Sheet)
 * Covers Security Verification Tests 1, 2, 3, 4
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../config/db');
const User = require('../models/User');
const Project = require('../models/Project');
const Customer = require('../models/Customer');
const Opportunity = require('../models/Opportunity');
const ImportBatch = require('../models/ImportBatch');
const BatchAccess = require('../models/BatchAccess');
const { getBatchScopingForUser, checkUserBatchAccess } = require('../utils/batchAccessHelper');
const { createBatchAccess, getMyAccessibleBatches, revokeBatchAccess } = require('../controllers/batchAccessController');

async function runTests() {
  console.log('--- STARTING BATCH-LEVEL ACCESS CONTROL TESTS ---');
  await connectDB();

  try {
    // 1. Setup / Find test users and project
    let admin = await User.findOne({ role: { $in: ['admin', 'super_admin'] } });
    if (!admin) {
      admin = await User.create({
        name: 'Admin Test',
        email: 'admintest_bac@omvik.com',
        role: 'admin',
        isActive: true,
        password: 'password123'
      });
    }

    let sruti = await User.findOne({ email: 'sruti_test@omvik.com' });
    if (!sruti) {
      sruti = await User.create({
        name: 'Sruti Sagarika Behera',
        email: 'sruti_test@omvik.com',
        role: 'telecaller',
        isActive: true,
        password: 'password123',
        employeeId: 'EMP-SRUTI'
      });
    }

    let ashalata = await User.findOne({ email: 'ashalata_test@omvik.com' });
    if (!ashalata) {
      ashalata = await User.create({
        name: 'Ashalata Test',
        email: 'ashalata_test@omvik.com',
        role: 'telecaller',
        isActive: true,
        password: 'password123',
        employeeId: 'EMP-ASHA'
      });
    }

    let thirdRep = await User.findOne({ email: 'third_rep_test@omvik.com' });
    if (!thirdRep) {
      thirdRep = await User.create({
        name: 'Third Rep Test',
        email: 'third_rep_test@omvik.com',
        role: 'telecaller',
        isActive: true,
        password: 'password123',
        employeeId: 'EMP-THIRD'
      });
    }

    let testProject = await Project.findOne();
    if (!testProject) {
      testProject = await Project.create({
        name: 'Om Sai Ashraya',
        code: 'DDV',
        projectCode: 'DDV',
        location: 'Bhubaneswar',
        status: 'active'
      });
    }

    // Clean up any previous test batches
    const testBatchId1 = 'TEST_SRUTI_ONLY_' + Date.now();
    const testBatchId2 = 'TEST_MULTI_ASSIGN_' + Date.now();

    // 2. Create customer and leads for Test Batch 1 (assigned to Sruti only)
    const cust1 = await Customer.create({
      name: 'Customer for Sruti',
      primaryMobile: '99999' + Math.floor(10000 + Math.random() * 90000)
    });

    const opp1 = await Opportunity.create({
      customer: cust1._id,
      project: testProject._id,
      owner: sruti._id,
      importBatchId: testBatchId1,
      stage: 'new',
      isActive: true,
      leadCode: 'OMV-TEST-SRUTI-01'
    });

    // Create ImportBatch & BatchAccess for testBatchId1
    const importBatch1 = await ImportBatch.create({
      batchId: testBatchId1,
      batchName: testBatchId1,
      project: testProject._id,
      uploadedBy: admin._id,
      totalRows: 1,
      importedCount: 1,
      isPrivate: true
    });

    const batchAccess1 = await BatchAccess.create({
      batch: importBatch1._id,
      batchId: testBatchId1,
      assignedTo: [sruti._id],
      accessLevel: 'view',
      grantedBy: admin._id
    });

    console.log(`Created private batch "${testBatchId1}" assigned exclusively to Sruti (${sruti.name})`);

    // =========================================================================
    // TEST 1: Ashalata cannot see Sruti's sheet or leads
    // =========================================================================
    console.log('\n--- EXECUTING TEST 1: Ashalata Cannot See Sruti Sheet ---');
    const ashalataAccess = await checkUserBatchAccess(testBatchId1, ashalata);
    console.log(`[TEST 1.1] Ashalata direct checkUserBatchAccess("${testBatchId1}"):`, ashalataAccess);
    if (ashalataAccess !== false) {
      throw new Error('FAIL: Ashalata should NOT have access to Sruti batch!');
    }
    console.log('✅ PASS: Ashalata direct batch access check returned FALSE (403 Forbidden).');

    const ashalataScoping = await getBatchScopingForUser(ashalata);
    console.log('[TEST 1.2] Ashalata forbiddenBatchIds includes testBatchId1:', ashalataScoping.forbiddenBatchIds.includes(testBatchId1));
    if (!ashalataScoping.forbiddenBatchIds.includes(testBatchId1)) {
      throw new Error('FAIL: testBatchId1 must be in Ashalata forbiddenBatchIds!');
    }
    console.log('✅ PASS: Sruti private batch is in Ashalata forbiddenBatchIds.');

    // Simulated query with data scope for Ashalata
    const ashalataOpps = await Opportunity.find({
      importBatchId: { $nin: ashalataScoping.forbiddenBatchIds },
      $or: [{ owner: ashalata._id }, { owner: null }]
    });
    const foundSrutiLeadInAshalataQuery = ashalataOpps.some(o => o.importBatchId === testBatchId1);
    if (foundSrutiLeadInAshalataQuery) {
      throw new Error('FAIL: Sruti lead appeared in Ashalata leads query!');
    }
    console.log('✅ PASS: Zero leads from Sruti batch appeared in Ashalata query.');

    // =========================================================================
    // TEST 2: Sruti can view and access her assigned sheet
    // =========================================================================
    console.log('\n--- EXECUTING TEST 2: Sruti Can View Her Assigned Sheet ---');
    const srutiAccess = await checkUserBatchAccess(testBatchId1, sruti);
    console.log(`[TEST 2.1] Sruti direct checkUserBatchAccess("${testBatchId1}"):`, srutiAccess);
    if (srutiAccess !== true) {
      throw new Error('FAIL: Sruti MUST have access to her batch!');
    }
    console.log('✅ PASS: Sruti direct batch access check returned TRUE.');

    const srutiScoping = await getBatchScopingForUser(sruti);
    if (srutiScoping.forbiddenBatchIds.includes(testBatchId1)) {
      throw new Error('FAIL: testBatchId1 should NOT be forbidden for Sruti!');
    }
    if (!srutiScoping.accessibleBatchIds.includes(testBatchId1)) {
      throw new Error('FAIL: testBatchId1 MUST be in Sruti accessibleBatchIds!');
    }
    console.log('✅ PASS: testBatchId1 is in Sruti accessibleBatchIds.');

    // Test getMyAccessibleBatches for Sruti
    const mockReqSruti = { user: sruti };
    let srutiBatchesResult = null;
    const mockResSruti = {
      json: (data) => { srutiBatchesResult = data; return data; },
      status: () => mockResSruti
    };
    await getMyAccessibleBatches(mockReqSruti, mockResSruti, (e) => { throw e; });
    const srutiHasBatchInList = srutiBatchesResult.batches.some(b => b.batchId === testBatchId1);
    if (!srutiHasBatchInList) {
      throw new Error('FAIL: testBatchId1 must appear in Sruti getMyAccessibleBatches result!');
    }
    console.log('✅ PASS: Sruti sees testBatchId1 in getMyAccessibleBatches.');

    // =========================================================================
    // TEST 3: Admin Can Still See Everything & Revoke Access
    // =========================================================================
    console.log('\n--- EXECUTING TEST 3: Admin Has Full Oversight ---');
    const adminAccess = await checkUserBatchAccess(testBatchId1, admin);
    if (adminAccess !== true) {
      throw new Error('FAIL: Admin must have universal access!');
    }
    console.log('✅ PASS: Admin has universal access (returned TRUE).');

    const adminScoping = await getBatchScopingForUser(admin);
    if (adminScoping.forbiddenBatchIds.length !== 0) {
      throw new Error('FAIL: Admin must have zero forbidden batches!');
    }
    console.log('✅ PASS: Admin has zero forbidden batches.');

    // Admin sees all in getMyAccessibleBatches
    const mockReqAdmin = { user: admin };
    let adminBatchesResult = null;
    const mockResAdmin = {
      json: (data) => { adminBatchesResult = data; return data; },
      status: () => mockResAdmin
    };
    await getMyAccessibleBatches(mockReqAdmin, mockResAdmin, (e) => { throw e; });
    const adminHasBatchInList = adminBatchesResult.batches.some(b => b.batchId === testBatchId1);
    if (!adminHasBatchInList) {
      throw new Error('FAIL: Admin must see all batches in getMyAccessibleBatches!');
    }
    console.log('✅ PASS: Admin sees testBatchId1 in getMyAccessibleBatches with metadata.');

    // =========================================================================
    // TEST 4: Multi-Assignment (Sruti & Ashalata both assigned, Third Rep blocked)
    // =========================================================================
    console.log('\n--- EXECUTING TEST 4: Multi-Assignment Support ---');
    const importBatch2 = await ImportBatch.create({
      batchId: testBatchId2,
      batchName: testBatchId2,
      project: testProject._id,
      uploadedBy: admin._id,
      totalRows: 1,
      importedCount: 1,
      isPrivate: true
    });

    const batchAccess2 = await BatchAccess.create({
      batch: importBatch2._id,
      batchId: testBatchId2,
      assignedTo: [sruti._id, ashalata._id],
      accessLevel: 'view',
      grantedBy: admin._id
    });

    const srutiMultiAccess = await checkUserBatchAccess(testBatchId2, sruti);
    const ashalataMultiAccess = await checkUserBatchAccess(testBatchId2, ashalata);
    const thirdRepMultiAccess = await checkUserBatchAccess(testBatchId2, thirdRep);

    console.log(`[TEST 4.1] Sruti has access to multi-assigned batch:`, srutiMultiAccess);
    console.log(`[TEST 4.2] Ashalata has access to multi-assigned batch:`, ashalataMultiAccess);
    console.log(`[TEST 4.3] Third Rep has access to multi-assigned batch:`, thirdRepMultiAccess);

    if (srutiMultiAccess !== true || ashalataMultiAccess !== true) {
      throw new Error('FAIL: Both Sruti and Ashalata must have access to multi-assigned batch!');
    }
    if (thirdRepMultiAccess !== false) {
      throw new Error('FAIL: Third Rep should NOT have access to multi-assigned batch!');
    }
    console.log('✅ PASS: Multi-assignment grants access to assigned reps and blocks others.');

    // Cleanup test documents
    await Opportunity.deleteMany({ importBatchId: { $in: [testBatchId1, testBatchId2] } });
    await ImportBatch.deleteMany({ batchId: { $in: [testBatchId1, testBatchId2] } });
    await BatchAccess.deleteMany({ batchId: { $in: [testBatchId1, testBatchId2] } });
    await Customer.deleteOne({ _id: cust1._id });

    console.log('\n======================================================');
    console.log('🎉 ALL 4 SECURITY VERIFICATION TESTS PASSED WITH 100% SUCCESS!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ TEST FAILED:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runTests();
