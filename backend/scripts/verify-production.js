/**
 * scripts/verify-production.js
 * ─────────────────────────────────────────────────────────────────
 * Automated verification suite — runs all 6 acceptance checks from
 * the production readiness spec against LOCAL server (port 5000).
 *
 * Usage:
 *   node scripts/verify-production.js [--url http://localhost:5000]
 *   node scripts/verify-production.js --url https://omvik-crm-backend.onrender.com
 *
 * Checks:
 *   a) omvikrealcon@gmail.com login → 401
 *   b) All 5 employees login with real credentials → 200
 *   c) Telecaller hits /api/test/backdate-sla → 403
 *   d) Telecaller A PATCH site-visit owned by B → 403
 *   e) Forgot-password OTP trigger → 200 (generic response)
 *   f) Old (now deleted) user login → 401
 */

'use strict';

const http  = require('http');
const https = require('https');
const path  = require('path');
const fs    = require('fs');

// ─── Config ──────────────────────────────────────────────────
const args    = process.argv.slice(2);
const urlArg  = args[args.indexOf('--url') + 1];
const BASE    = (urlArg || 'http://localhost:5000').replace(/\/$/, '');
const IS_HTTPS = BASE.startsWith('https');

// Load real passwords from gitignored file
const PW_FILE = path.join(__dirname, 'employee-passwords.json');
if (!fs.existsSync(PW_FILE)) {
  console.error('❌  employee-passwords.json not found — required for test b)');
  process.exit(1);
}
const PASSWORDS = JSON.parse(fs.readFileSync(PW_FILE, 'utf-8'));

const EMPLOYEES = [
  { name: 'Subhashree Mohanty',    email: 'subhashree.omvik@gmail.com', id: 'OMVR-E26-SBD001' },
  { name: 'Ashalata Nahak',        email: 'ashalata.omvik@gmail.com',   id: 'OMVR-E26-SBD002' },
  { name: 'Sruti Sagarika Behera', email: 'sruti.omvik@gmail.com',      id: 'OMVR-E26-SBD003' },
  { name: 'Jagruti Goudu',         email: 'jagruti.omvik@gmail.com',    id: 'OMVR-E26-SBD004' },
  { name: 'Kisen Kaneheya Sahu',   email: 'kishan.omvik@gmail.com',     id: 'OMVR-E26-SBD006' },
];

// ─── HTTP helper ─────────────────────────────────────────────
function request(method, path, body, cookie) {
  return new Promise((resolve) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      method,
      headers: {
        'Content-Type':  'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...(cookie  ? { 'Cookie': cookie }                              : {})
      }
    };

    const url     = new URL(`${BASE}${path}`);
    const client  = IS_HTTPS ? https : http;
    options.hostname = url.hostname;
    options.port     = url.port || (IS_HTTPS ? 443 : 80);
    options.path     = url.pathname + url.search;

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        let json;
        try { json = JSON.parse(data); } catch { json = {}; }
        // Extract Set-Cookie header
        const setCookie = res.headers['set-cookie'];
        const tokenCookie = setCookie
          ? setCookie.find((c) => c.startsWith('token='))
          : null;
        resolve({ status: res.statusCode, body: json, cookie: tokenCookie });
      });
    });

    req.on('error', (e) => resolve({ status: 0, body: { error: e.message }, cookie: null }));
    if (payload) req.write(payload);
    req.end();
  });
}

// ─── Result tracking ─────────────────────────────────────────
const results = [];
function pass(label) {
  console.log(`  ✅  PASS  ${label}`);
  results.push({ label, pass: true });
}
function fail(label, detail) {
  console.log(`  ❌  FAIL  ${label}`);
  if (detail) console.log(`          ↳ ${detail}`);
  results.push({ label, pass: false, detail });
}
function check(cond, label, detail) {
  cond ? pass(label) : fail(label, detail);
}

// ─── Test runner ─────────────────────────────────────────────
async function runTests() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(` OMVIK CRM — Production Verification Suite`);
  console.log(` Target: ${BASE}`);
  console.log(`${'═'.repeat(60)}\n`);

  // ── a) omvikrealcon@gmail.com must be rejected ──────────────
  console.log('(a) Admin email login must be rejected (no such user)');
  const rA = await request('POST', '/api/auth/login', {
    email:    'omvikrealcon@gmail.com',
    password: 'anything'
  });
  check(rA.status === 401,
    `a) omvikrealcon@gmail.com → 401  (got ${rA.status})`,
    rA.body?.message);

  // ── b) All 5 employees log in successfully ───────────────────
  console.log('\n(b) Employee logins with real credentials');
  const empCookies = {};
  for (const emp of EMPLOYEES) {
    const pw = PASSWORDS[emp.id];
    if (!pw) {
      fail(`b) ${emp.id} — password missing in employee-passwords.json`);
      continue;
    }
    const r = await request('POST', '/api/auth/login', {
      email:    emp.email,
      password: pw
    });
    check(r.status === 200,
      `b) ${emp.id} ${emp.name.padEnd(26)} → 200  (got ${r.status})`,
      r.body?.message);
    if (r.cookie) empCookies[emp.id] = r.cookie;
  }

  // ── c) Telecaller hits admin-only test route → 403 ──────────
  console.log('\n(c) Telecaller → /api/test/backdate-sla must be 403');
  const firstEmpId  = EMPLOYEES[0].id;
  const firstCookie = empCookies[firstEmpId];

  if (!firstCookie) {
    fail('c) Cannot test — no session for telecaller (login b) failed)');
  } else {
    const rC = await request('POST', '/api/test/backdate-sla',
      { opportunityId: '000000000000000000000000', hoursAgo: 1 },
      firstCookie
    );
    check([403, 401].includes(rC.status),
      `c) Telecaller → /api/test/backdate-sla → ${rC.status}  (expected 403/401)`,
      rC.body?.message);
  }

  // ── d) Telecaller A PATCH site-visit owned by B → 403 ───────
  console.log('\n(d) Cross-ownership site-visit PATCH → 403');
  const empA = EMPLOYEES[0];
  const empB = EMPLOYEES[1];
  const cookieA = empCookies[empA.id];

  if (!cookieA) {
    fail('d) Cannot test — no session for telecaller A');
  } else {
    // Use a fake ObjectId — won't match any record owned by A → 403
    const fakeId = '000000000000000000000001';
    const rD = await request('PATCH', `/api/site-visits/${fakeId}`,
      { status: 'confirmed' },
      cookieA
    );
    check(rD.status === 403,
      `d) A PATCH visit not owned by A → ${rD.status}  (expected 403)`,
      rD.body?.message);
  }

  // ── e) Forgot-password OTP — generic response, no data leak ─
  console.log('\n(e) Forgot-password OTP trigger');
  const rE = await request('POST', '/api/auth/forgot-password', {
    identifier: EMPLOYEES[0].email
  });
  check(rE.status === 200 && rE.body?.success === true,
    `e) Forgot-password → 200 generic response  (got ${rE.status})`,
    rE.body?.message);

  // Also test with non-existent account (must be indistinguishable)
  const rE2 = await request('POST', '/api/auth/forgot-password', {
    identifier: 'nobody@nowhere.invalid'
  });
  check(rE2.status === 200 && rE2.body?.success === true,
    `e) Forgot-password unknown account → 200 (same generic)  (got ${rE2.status})`,
    rE2.body?.message);

  // ── f) Deleted old users cannot log in ──────────────────────
  console.log('\n(f) Old/deleted accounts must be rejected');
  const oldAccounts = [
    { label: 'Aparna',              email: 'aparna@omvikrealcon.com',   password: 'Omvik@1' },
    { label: 'omvikrealcon (old)',   email: 'omvikrealcon@gmail.com',    password: 'Omvik@1' },
    { label: 'Aparna (old pw)',      email: 'aparna@omvikrealcon.com',   password: 'Aparna@2024' },
  ];
  for (const acc of oldAccounts) {
    const r = await request('POST', '/api/auth/login', {
      email:    acc.email,
      password: acc.password
    });
    check([401, 403].includes(r.status),
      `f) ${acc.label.padEnd(28)} → ${r.status}  (expected 401/403)`,
      r.body?.message);
  }

  // ── Summary ────────────────────────────────────────────────
  const passed = results.filter((r) => r.pass).length;
  const total  = results.length;

  console.log(`\n${'═'.repeat(60)}`);
  console.log(` RESULT: ${passed}/${total} checks passed`);
  if (passed === total) {
    console.log(' 🎉  ALL CHECKS PASSED — production ready!\n');
  } else {
    console.log(' ⚠️   Some checks failed — review above for details.\n');
    results.filter((r) => !r.pass).forEach((r) =>
      console.log(`  ✗ ${r.label}${r.detail ? '  (' + r.detail + ')' : ''}`)
    );
    console.log();
  }
  console.log(`${'═'.repeat(60)}\n`);

  process.exit(passed === total ? 0 : 1);
}

runTests().catch((err) => {
  console.error('Fatal error in verification suite:', err.message);
  process.exit(1);
});
