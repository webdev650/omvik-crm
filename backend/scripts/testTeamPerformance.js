const http = require('http');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
require('dotenv').config();

const app = require('../server');

function makeRequest(path, token) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: process.env.PORT || 5000,
        path,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function runTest() {
  // Wait for mongoose connection
  if (mongoose.connection.readyState !== 1) {
    await new Promise((resolve) => mongoose.connection.once('open', resolve));
  }

  // Small delay to ensure port 5000 is listening
  await new Promise((r) => setTimeout(r, 1000));

  const admin = await mongoose.connection.collection('users').findOne({ role: 'admin' });
  const telecaller = await mongoose.connection.collection('users').findOne({ role: 'telecaller' });

  if (!admin || !telecaller) {
    console.error('Missing admin or telecaller user in DB');
    process.exit(1);
  }

  const adminToken = jwt.sign({ id: admin._id }, process.env.JWT_SECRET);
  const telecallerToken = jwt.sign({ id: telecaller._id }, process.env.JWT_SECRET);

  console.log('=== TEST 1: Admin calls GET /api/performance/team ===');
  const t0 = Date.now();
  const res1 = await makeRequest('/api/performance/team', adminToken);
  const duration = Date.now() - t0;
  console.log(`Status: ${res1.status} (Duration: ${duration}ms, Target: <1000ms)`);
  console.log(`Range: ${res1.body.range}, From: ${res1.body.from}, To: ${res1.body.to}`);
  console.log(`Working Days: ${res1.body.workingDays}`);
  console.log(`Totals:`, res1.body.totals);
  console.log(`Employee Count: ${res1.body.employees?.length}`);

  // Check no admin is in employee rows
  const adminInEmployees = res1.body.employees?.some((e) =>
    ['admin', 'super_admin', 'director'].includes(e.role)
  );
  console.log(`No admins in rows? ${!adminInEmployees ? 'PASS' : 'FAIL'}`);

  // Check team totals equal sum of employee rows
  const sumLeads = res1.body.employees?.reduce((acc, e) => acc + e.totalLeads, 0);
  const sumCalls = res1.body.employees?.reduce((acc, e) => acc + e.calls, 0);
  const sumDeals = res1.body.employees?.reduce((acc, e) => acc + e.dealsWon, 0);
  console.log(
    `Totals match sum? leads(${sumLeads === res1.body.totals?.totalLeads}), calls(${
      sumCalls === res1.body.totals?.calls
    }), deals(${sumDeals === res1.body.totals?.dealsWon})`
  );

  console.log('\n=== TEST 2: Telecaller calls GET /api/performance/team (should be 403) ===');
  const res2 = await makeRequest('/api/performance/team', telecallerToken);
  console.log(`Status: ${res2.status} (Expected: 403) - ${res2.status === 403 ? 'PASS' : 'FAIL'}`);

  console.log('\n=== TEST 3: Admin calls GET /api/performance/team/:userId ===');
  if (res1.body.employees?.length > 0) {
    const emp = res1.body.employees[0];
    const res3 = await makeRequest(`/api/performance/team/${emp.userId}`, adminToken);
    console.log(`Status: ${res3.status} - Employee: ${res3.body.employee?.name}`);
    console.log(`Employee Detail Performance:`, res3.body.performance);
  }

  console.log('\n=== TEST 4: Telecaller calls GET /api/performance/team/:userId (should be 403) ===');
  if (res1.body.employees?.length > 0) {
    const emp = res1.body.employees[0];
    const res4 = await makeRequest(`/api/performance/team/${emp.userId}`, telecallerToken);
    console.log(`Status: ${res4.status} (Expected: 403) - ${res4.status === 403 ? 'PASS' : 'FAIL'}`);
  }

  console.log('\n=== TEST 5: Date Filters (today, yesterday, last_7_days, last_month) ===');
  for (const r of ['today', 'yesterday', 'last_7_days', 'last_month']) {
    const resFilter = await makeRequest(`/api/performance/team?range=${r}`, adminToken);
    console.log(`Filter [${r}] => Status: ${resFilter.status}, From: ${resFilter.body.from}, To: ${resFilter.body.to}`);
  }

  process.exit(0);
}

runTest().catch((err) => {
  console.error(err);
  process.exit(1);
});
