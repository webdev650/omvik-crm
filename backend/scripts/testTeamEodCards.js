require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const DailyReport = require('../models/DailyReport');
const Leave = require('../models/Leave');
const { getTeamOverview } = require('../controllers/dailyReportController');

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING TEAM EOD SUMMARY CARDS & BEHAVIOUR SUITE');
  console.log('====================================================\n');

  if (!process.env.MONGO_URI) {
    console.error('❌ Error: MONGO_URI missing');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB\n');

  const todayStr = new Date().toISOString().split('T')[0];
  const pastDateStr = '2026-10-15';

  const adminUser = (await User.findOne({ role: 'admin' })) || (await User.findOne({}));

  async function callOverview(date) {
    const mockReq = { query: { date }, user: adminUser };
    let result = null;
    const mockRes = {
      json: (d) => {
        result = d;
        return d;
      }
    };
    await getTeamOverview(mockReq, mockRes, (err) => {
      if (err) throw err;
    });
    return result;
  }

  // TEST 1: Each card count equals the number of names in its list for today and past date
  console.log('--- TEST 1: Card counts match exact list lengths for today & past date ---');
  for (const date of [todayStr, pastDateStr]) {
    const res = await callOverview(date);
    const list = res.overview;

    const totalList = list;
    const submittedList = list.filter((i) => i.submitted);
    const pendingList = list.filter((i) => !i.submitted && !i.isExempt && !i.isOnLeave);
    const flaggedList = list.filter((i) => i.report?.discrepancyFlag);

    const totalMatch = res.totalCount === totalList.length;
    const submittedMatch = res.submittedCount === submittedList.length;
    const pendingMatch = res.pendingCount === pendingList.length;
    const flaggedMatch = res.discrepantCount === flaggedList.length;

    console.log(`Date: ${date}`);
    console.log(`  Total: count=${res.totalCount}, list=${totalList.length} -> ${totalMatch ? 'PASS' : 'FAIL'}`);
    console.log(`  Submitted: count=${res.submittedCount}, list=${submittedList.length} -> ${submittedMatch ? 'PASS' : 'FAIL'}`);
    console.log(`  Pending: count=${res.pendingCount}, list=${pendingList.length} -> ${pendingMatch ? 'PASS' : 'FAIL'}`);
    console.log(`  Flagged: count=${res.discrepantCount}, list=${flaggedList.length} -> ${flaggedMatch ? 'PASS' : 'FAIL'}`);

    if (!totalMatch || !submittedMatch || !pendingMatch || !flaggedMatch) {
      console.error('❌ TEST 1 FAILED');
      process.exit(1);
    }
  }
  console.log('✅ TEST 1 PASSED: Counts and lists strictly equal for today and past date.\n');

  // TEST 2: A telecaller who submits moves from Pending to Submitted
  console.log('--- TEST 2: Submission moves telecaller from Pending to Submitted ---');
  const testTelecaller = await User.findOne({ role: 'telecaller', isActive: true });
  if (!testTelecaller) {
    console.warn('⚠️ No active telecaller found, skipping simulation');
  } else {
    // Delete any existing report for today for testTelecaller to ensure Pending state
    await DailyReport.deleteOne({ user: testTelecaller._id, date: todayStr });

    const beforeRes = await callOverview(todayStr);
    const inPendingBefore = beforeRes.overview.some(
      (i) => i.user._id.toString() === testTelecaller._id.toString() && i.status === 'Pending'
    );
    console.log(`  Before submission: ${testTelecaller.name} in Pending? ${inPendingBefore}`);

    // Create submitted report
    const newReport = await DailyReport.create({
      user: testTelecaller._id,
      date: todayStr,
      claimedCalls: 10,
      systemActivityCount: 10,
      connectedCalls: 4,
      systemConnectedCallsCount: 4,
      discrepancyFlag: false
    });

    const afterRes = await callOverview(todayStr);
    const inSubmittedAfter = afterRes.overview.some(
      (i) => i.user._id.toString() === testTelecaller._id.toString() && i.submitted === true
    );
    const inPendingAfter = afterRes.overview.some(
      (i) => i.user._id.toString() === testTelecaller._id.toString() && i.status === 'Pending'
    );

    console.log(`  After submission: ${testTelecaller.name} in Submitted? ${inSubmittedAfter}`);
    console.log(`  After submission: ${testTelecaller.name} in Pending? ${inPendingAfter}`);

    if (inPendingBefore && inSubmittedAfter && !inPendingAfter) {
      console.log('✅ TEST 2 PASSED: Telecaller transitioned from Pending to Submitted cleanly.');
    } else {
      console.error('❌ TEST 2 FAILED');
      process.exit(1);
    }

    // TEST 3: Flagged report appears under both Submitted (with Flagged badge) and Discrepancies Flagged
    console.log('\n--- TEST 3: Flagged report appears under Submitted & Discrepancies Flagged ---');
    newReport.discrepancyFlag = true;
    newReport.discrepancyNote = 'Calls: claimed 10 vs 0 logged';
    newReport.claimedCalls = 10;
    newReport.systemActivityCount = 0;
    await newReport.save();

    const flaggedOverview = await callOverview(todayStr);
    const flaggedPerson = flaggedOverview.overview.find(
      (i) => i.user._id.toString() === testTelecaller._id.toString()
    );

    const isSubmitted = flaggedPerson && flaggedPerson.submitted;
    const isStatusFlagged = flaggedPerson && flaggedPerson.status === 'Flagged';
    const inFlaggedList = flaggedOverview.overview.filter((i) => i.report?.discrepancyFlag).some(
      (i) => i.user._id.toString() === testTelecaller._id.toString()
    );

    console.log(`  Flagged report submitted: ${isSubmitted}`);
    console.log(`  Status marked as Flagged: ${isStatusFlagged}`);
    console.log(`  Present in Discrepancies Flagged list: ${inFlaggedList}`);

    if (isSubmitted && isStatusFlagged && inFlaggedList) {
      console.log('✅ TEST 3 PASSED: Flagged report appears under both Submitted (with Flagged status) and Discrepancies Flagged.');
    } else {
      console.error('❌ TEST 3 FAILED');
      process.exit(1);
    }

    // Clean up test report
    await DailyReport.deleteOne({ _id: newReport._id });
  }

  // TEST 4: Exempt roles never appear in Pending
  console.log('\n--- TEST 4: Exempt roles (super_admin, admin, director) never in Pending ---');
  const resExempt = await callOverview(todayStr);
  const pendingUsers = resExempt.overview.filter((i) => !i.submitted && !i.isExempt && !i.isOnLeave);
  const exemptInPending = pendingUsers.filter((i) => ['super_admin', 'admin', 'director'].includes(i.user.role));
  console.log(`  Exempt users in Pending: ${exemptInPending.length}`);
  if (exemptInPending.length === 0) {
    console.log('✅ TEST 4 PASSED: 0 exempt users appear in Pending list.');
  } else {
    console.error('❌ TEST 4 FAILED: Exempt users appeared in Pending');
    process.exit(1);
  }

  await mongoose.disconnect();
  console.log('\n====================================================');
  console.log('🎉 ALL INTEGRITY TESTS PASSED!');
  console.log('====================================================');
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
