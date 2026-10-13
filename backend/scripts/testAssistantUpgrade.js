require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const User = require('../models/User');
const Opportunity = require('../models/Opportunity');
const Customer = require('../models/Customer');
const Project = require('../models/Project');
const Followup = require('../models/Followup');
const Task = require('../models/Task');
const SiteVisit = require('../models/SiteVisit');
const DailyReport = require('../models/DailyReport');
const Activity = require('../models/Activity');

const { getAssistantMessage, getKolkataDateInfo, pickRotatingVariant } = require('../controllers/assistantController');

// Helper to mock Express req & res
function mockReqRes(user, query = {}) {
  const req = {
    user,
    query,
    headers: {}
  };
  let responseData = null;
  let statusCode = 200;

  const res = {
    status: (code) => {
      statusCode = code;
      return res;
    },
    json: (data) => {
      responseData = data;
      return res;
    }
  };

  return { req, res, getResponse: () => ({ statusCode, data: responseData }) };
}

async function runTests() {
  console.log('===============================================================');
  console.log('   OMVIK ASSISTANT UPGRADE VERIFICATION TEST SUITE');
  console.log('===============================================================\n');

  let mongod = null;
  try {
    // Try primary URI with short timeout, fallback to MongoMemoryServer
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 2000 });
    console.log('[DB] Connected to configured MongoDB');
  } catch (err) {
    console.log('[DB] Primary MongoDB not available, starting MongoMemoryServer...');
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    console.log('[DB] Connected to In-Memory MongoDB');
  }

  const results = {
    test1_overdue: false,
    test2_all_done: false,
    test3_no_tasks: false,
    test4_admin_time_based: false,
    test5_data_isolation: false,
    test_site_visit_priority: false,
    test_due_today_priority: false,
    test_eod_pending_after_5pm: false,
    test_rotation: false
  };

  try {
    // Clean test collections
    await User.deleteMany({ email: /@test-assistant\.com$/ });

    // Create test project and customer
    let project = await Project.findOne();
    if (!project) {
      project = await Project.create({
        name: 'Omvik Heights',
        code: 'OH-001',
        location: 'Bhubaneswar',
        type: 'residential'
      });
    }

    const ts = Date.now();
    const testCustomer = await Customer.create({
      name: `Test Customer ${ts}`,
      primaryMobile: String(ts).slice(-10)
    });

    // 1. Create Test Users with unique employeeId
    const adminUser = await User.create({
      name: 'Rohan Sharma',
      email: `admin_rohan_${ts}@test-assistant.com`,
      employeeId: `TEST-ADM-${ts}-1`,
      password: 'password123',
      role: 'admin'
    });

    const directorUser = await User.create({
      name: 'Anita Roy',
      email: `director_anita_${ts}@test-assistant.com`,
      employeeId: `TEST-DIR-${ts}-2`,
      password: 'password123',
      role: 'director'
    });

    const empVikram = await User.create({
      name: 'Vikram Das',
      email: `vikram_${ts}@test-assistant.com`,
      employeeId: `TEST-EMP-${ts}-3`,
      password: 'password123',
      role: 'telecaller'
    });

    const empPooja = await User.create({
      name: 'Pooja Sen',
      email: `pooja_${ts}@test-assistant.com`,
      employeeId: `TEST-EMP-${ts}-4`,
      password: 'password123',
      role: 'field_executive'
    });

    const opp = await Opportunity.create({
      customer: testCustomer._id,
      project: project._id,
      owner: empVikram._id,
      stage: 'new'
    });

    const kolkata = getKolkataDateInfo(new Date());
    const { todayStr, startOfDayUtc, endOfDayUtc } = kolkata;

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 1: Employee with overdue follow-ups sees reminder with correct count
    // ─────────────────────────────────────────────────────────────────────────
    console.log('--- TEST 1: Employee with overdue follow-ups ---');
    // Create 3 overdue follow-ups for Vikram
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    await Followup.create([
      { opportunity: opp._id, owner: empVikram._id, dueAt: oneHourAgo, status: 'scheduled' },
      { opportunity: opp._id, owner: empVikram._id, dueAt: oneHourAgo, status: 'scheduled' },
      { opportunity: opp._id, owner: empVikram._id, dueAt: oneHourAgo, status: 'overdue' }
    ]);

    const { req: req1, res: res1, getResponse: getRes1 } = mockReqRes(empVikram);
    await getAssistantMessage(req1, res1);
    const resp1 = getRes1().data;

    console.log('Result 1:', resp1);
    if (
      resp1.type === 'reminder' &&
      resp1.counts?.overdueFollowups === 3 &&
      resp1.message.includes('3') &&
      resp1.message.toLowerCase().includes('overdue')
    ) {
      console.log('-> PASS: Test 1 (Overdue follow-ups reminder shows real count 3)\n');
      results.test1_overdue = true;
    } else {
      console.error('-> FAIL: Test 1 failed\n');
    }

    // Clean up followups for Vikram
    await Followup.deleteMany({ owner: empVikram._id });

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 2: Employee with all tasks done and EOD submitted sees appreciation
    // ─────────────────────────────────────────────────────────────────────────
    console.log('--- TEST 2: Employee with all tasks done and EOD submitted ---');
    // Create a completed task for today and a submitted daily report
    await Task.create({
      title: 'Site documentation complete',
      owner: empVikram._id,
      status: 'completed',
      dueDate: new Date()
    });

    await DailyReport.create({
      user: empVikram._id,
      date: todayStr,
      claimedCalls: 10,
      connectedCalls: 6,
      notes: 'Completed all today goals'
    });

    // Mock call after 5 PM (simulateHour: 18)
    const { req: req2, res: res2, getResponse: getRes2 } = mockReqRes(empVikram, { simulateHour: 18 });
    await getAssistantMessage(req2, res2);
    const resp2 = getRes2().data;

    const appreciationPool = [
      'Great work today! All your tasks are completed.',
      'Outstanding job today! All your tasks and follow-ups are completed.',
      'Fantastic effort today! Everything on your schedule is completed.',
      'Superb work today! All your tasks are done. Enjoy your rest!'
    ];

    console.log('Result 2:', resp2);
    if (
      resp2.type === 'appreciation' &&
      resp2.counts?.isEodSubmitted === true &&
      resp2.counts?.overdueFollowups === 0 &&
      resp2.counts?.pendingTasks === 0 &&
      appreciationPool.includes(resp2.message)
    ) {
      console.log('-> PASS: Test 2 (All tasks done + EOD submitted -> appreciation)\n');
      results.test2_all_done = true;
    } else {
      console.error('-> FAIL: Test 2 failed\n');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 3: Employee with no tasks sees neutral message, not praise
    // ─────────────────────────────────────────────────────────────────────────
    console.log('--- TEST 3: Employee with no tasks assigned ---');
    // Pooja has NO tasks, NO followups, NO visits, NO daily report
    const { req: req3, res: res3, getResponse: getRes3 } = mockReqRes(empPooja);
    await getAssistantMessage(req3, res3);
    const resp3 = getRes3().data;

    const noTasksPool = [
      'No tasks assigned yet. Check your leads and start calling.',
      'No pending tasks right now. Check your leads and start calling.',
      'Your task queue is empty. Check your leads and reach out to prospects.',
      'No tasks assigned for today. Review your pipeline and start calling.'
    ];

    console.log('Result 3:', resp3);
    const praiseKeywords = ['great work', 'outstanding', 'fantastic', 'superb', 'congratulations', 'praise'];
    const hasPraise = praiseKeywords.some(w => resp3.message.toLowerCase().includes(w));

    if (
      resp3.type === 'info' &&
      noTasksPool.includes(resp3.message) &&
      !hasPraise
    ) {
      console.log('-> PASS: Test 3 (No tasks assigned -> neutral message, zero unearned praise)\n');
      results.test3_no_tasks = true;
    } else {
      console.error('-> FAIL: Test 3 failed\n');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 4: Admin sees only time-based greeting at morning, afternoon, evening, night
    // ─────────────────────────────────────────────────────────────────────────
    console.log('--- TEST 4: Admin sees time-based wishes (morning, afternoon, evening, night) ---');
    const timeSlots = [
      { hour: 9, expectedPrefix: 'Good Morning, Rohan!', name: 'Morning' },
      { hour: 14, expectedPrefix: 'Good Afternoon, Rohan!', name: 'Afternoon' },
      { hour: 19, expectedPrefix: 'Good Evening, Rohan!', name: 'Evening' },
      { hour: 23, expectedPrefix: 'Good Night, Rohan!', name: 'Night' }
    ];

    let allSlotsPassed = true;
    for (const slot of timeSlots) {
      const { req, res, getResponse } = mockReqRes(adminUser, { simulateHour: slot.hour });
      await getAssistantMessage(req, res);
      const resp = getResponse().data;
      console.log(`Slot ${slot.name} (${slot.hour}:00):`, resp);

      if (
        resp.type === 'greeting' &&
        resp.counts === null &&
        resp.message.includes(slot.expectedPrefix) &&
        !resp.message.toLowerCase().includes('follow-up') &&
        !resp.message.toLowerCase().includes('task')
      ) {
        console.log(`  ✓ ${slot.name} greeting verified: "${resp.message}"`);
      } else {
        console.error(`  ✗ ${slot.name} greeting failed`);
        allSlotsPassed = false;
      }
    }

    // Also check director role
    const { req: reqDir, res: resDir, getResponse: getResDir } = mockReqRes(directorUser, { simulateHour: 10 });
    await getAssistantMessage(reqDir, resDir);
    const respDir = getResDir().data;
    if (respDir.type === 'greeting' && respDir.message.includes('Good Morning, Anita!') && respDir.counts === null) {
      console.log(`  ✓ Director greeting verified: "${respDir.message}"`);
    } else {
      console.error('  ✗ Director greeting failed');
      allSlotsPassed = false;
    }

    if (allSlotsPassed) {
      console.log('-> PASS: Test 4 (Admin time-based greetings at all 4 times, no task messages, counts: null)\n');
      results.test4_admin_time_based = true;
    } else {
      console.error('-> FAIL: Test 4 failed\n');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 5: Employee cannot see other employees' data through this endpoint
    // ─────────────────────────────────────────────────────────────────────────
    console.log('--- TEST 5: Employee data isolation ---');
    // Vikram has a completed task and daily report from Test 2.
    // Pooja has no records.
    // Query Vikram:
    const { req: reqV, res: resV, getResponse: getResV } = mockReqRes(empVikram);
    await getAssistantMessage(reqV, resV);
    const vikramData = getResV().data;

    // Query Pooja:
    const { req: reqP, res: resP, getResponse: getResP } = mockReqRes(empPooja);
    await getAssistantMessage(reqP, resP);
    const poojaData = getResP().data;

    console.log('Vikram counts:', vikramData.counts);
    console.log('Pooja counts:', poojaData.counts);

    if (
      vikramData.counts?.isEodSubmitted === true &&
      poojaData.counts?.isEodSubmitted === false &&
      poojaData.counts?.pendingTasks === 0 &&
      poojaData.counts?.overdueFollowups === 0 &&
      poojaData.type === 'info'
    ) {
      console.log('-> PASS: Test 5 (Strict data isolation verified: Employee only sees own records)\n');
      results.test5_data_isolation = true;
    } else {
      console.error('-> FAIL: Test 5 failed\n');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADDITIONAL PRIORITY TESTS: Site Visit, Followups Due Today, EOD pending
    // ─────────────────────────────────────────────────────────────────────────
    console.log('--- ADDITIONAL PRIORITY TESTS ---');

    // Clean up Vikram
    await Task.deleteMany({ owner: empVikram._id });
    await DailyReport.deleteMany({ user: empVikram._id });
    await Followup.deleteMany({ owner: empVikram._id });
    await SiteVisit.deleteMany({ $or: [{ owner: empVikram._id }, { scheduledBy: empVikram._id }] });

    // Test Site Visit Priority (Priority c)
    const futureVisitTime = new Date();
    futureVisitTime.setHours(16, 0, 0, 0); // 4:00 PM today
    await SiteVisit.create({
      opportunity: opp._id,
      scheduledBy: empVikram._id,
      owner: empVikram._id,
      scheduledAt: futureVisitTime,
      status: 'planned'
    });

    const { req: reqSV, res: resSV, getResponse: getResSV } = mockReqRes(empVikram);
    await getAssistantMessage(reqSV, resSV);
    const respSV = getResSV().data;
    console.log('Site Visit Result:', respSV);
    if (respSV.type === 'reminder' && respSV.message.includes('site visit') && respSV.message.includes('4:00 PM')) {
      console.log('  ✓ Priority (c) Site visit reminder verified');
      results.test_site_visit_priority = true;
    }

    // Clean up site visit
    await SiteVisit.deleteMany({ $or: [{ owner: empVikram._id }, { scheduledBy: empVikram._id }] });

    // Test Follow-ups Due Today (Priority b)
    const futureFollowupTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now today
    const followupsList = [];
    for (let i = 0; i < 5; i++) {
      followupsList.push({
        opportunity: opp._id,
        owner: empVikram._id,
        dueAt: futureFollowupTime,
        status: 'scheduled'
      });
    }
    await Followup.create(followupsList);

    const { req: reqDT, res: resDT, getResponse: getResDT } = mockReqRes(empVikram);
    await getAssistantMessage(reqDT, resDT);
    const respDT = getResDT().data;
    console.log('Follow-ups Due Today Result:', respDT);
    if (respDT.type === 'reminder' && respDT.counts?.followupsDueToday === 5 && respDT.message.includes('5 follow-up')) {
      console.log('  ✓ Priority (b) Due today count reminder verified');
      results.test_due_today_priority = true;
    }

    // Clean up followups
    await Followup.deleteMany({ owner: empVikram._id });

    // Test EOD pending after 5 PM (Priority d)
    // Add completed task today so user has completed work
    await Task.create({
      title: 'Customer call done',
      owner: empVikram._id,
      status: 'completed',
      dueDate: new Date()
    });

    // Mock call at 6 PM (18:00) with no EOD submitted
    const { req: reqEOD, res: resEOD, getResponse: getResEOD } = mockReqRes(empVikram, { simulateHour: 18 });
    await getAssistantMessage(reqEOD, resEOD);
    const respEOD = getResEOD().data;
    console.log('EOD pending after 5 PM Result:', respEOD);
    if (respEOD.type === 'reminder' && respEOD.message.includes('EOD report')) {
      console.log('  ✓ Priority (d) EOD reminder after 5 PM verified');
      results.test_eod_pending_after_5pm = true;
    }

    // Test pre-5 PM (at 14:00): should NOT show EOD reminder
    const { req: reqPre5, res: resPre5, getResponse: getResPre5 } = mockReqRes(empVikram, { simulateHour: 14 });
    await getAssistantMessage(reqPre5, resPre5);
    const respPre5 = getResPre5().data;
    console.log('Pre-5 PM Result (should not mention EOD):', respPre5);
    if (!respPre5.message.includes('EOD report') && respPre5.type === 'appreciation') {
      console.log('  ✓ EOD reminder is NOT shown before 5 PM (shows appreciation instead)');
    }

    // Test rotation without repetition
    const pool = ['Line A', 'Line B', 'Line C', 'Line D'];
    const picked = [];
    for (let i = 0; i < 6; i++) {
      picked.push(pickRotatingVariant('test_user_key', pool));
    }
    console.log('Rotation sample:', picked);
    let hasConsecutiveDupe = false;
    for (let i = 1; i < picked.length; i++) {
      if (picked[i] === picked[i - 1]) hasConsecutiveDupe = true;
    }
    if (!hasConsecutiveDupe) {
      console.log('  ✓ Rotation verified: no consecutive duplicate lines');
      results.test_rotation = true;
    }

    // Clean up all created test data
    await User.deleteMany({ email: /@test-assistant\.com$/ });
    await Customer.deleteMany({ _id: testCustomer._id });
    await Opportunity.deleteMany({ _id: opp._id });
    await Task.deleteMany({ owner: empVikram._id });
    await Followup.deleteMany({ owner: empVikram._id });
    await DailyReport.deleteMany({ user: empVikram._id });
    await SiteVisit.deleteMany({ $or: [{ owner: empVikram._id }, { scheduledBy: empVikram._id }] });

    console.log('\n===============================================================');
    console.log('   TEST SUMMARY RESULTS');
    console.log('===============================================================');
    console.log('Test 1 (Overdue follow-ups reminder):', results.test1_overdue ? 'PASS' : 'FAIL');
    console.log('Test 2 (All tasks done + EOD -> Appreciation):', results.test2_all_done ? 'PASS' : 'FAIL');
    console.log('Test 3 (No tasks -> Neutral message, no praise):', results.test3_no_tasks ? 'PASS' : 'FAIL');
    console.log('Test 4 (Admin time-based wishes only):', results.test4_admin_time_based ? 'PASS' : 'FAIL');
    console.log('Test 5 (Data isolation between employees):', results.test5_data_isolation ? 'PASS' : 'FAIL');
    console.log('Site Visit Priority:', results.test_site_visit_priority ? 'PASS' : 'FAIL');
    console.log('Due Today Priority:', results.test_due_today_priority ? 'PASS' : 'FAIL');
    console.log('EOD Pending After 5 PM:', results.test_eod_pending_after_5pm ? 'PASS' : 'FAIL');
    console.log('Rotation without repetition:', results.test_rotation ? 'PASS' : 'FAIL');

  } catch (error) {
    console.error('Fatal test runner error:', error);
  } finally {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  }
}

runTests();
