/**
 * scripts/seed-employees.js
 * ─────────────────────────────────────────────────────────────
 * ONE-SHOT: wipe ALL users + every collection that references them,
 * then seed exactly the 5 real Telesales Executives.
 *
 * Passwords are read from scripts/employee-passwords.json (gitignored).
 * They are NEVER stored or logged in plaintext — bcrypt-hashed before insert.
 *
 * Usage:
 *   node scripts/seed-employees.js
 */

'use strict';

const path    = require('path');
const fs      = require('fs');
const bcrypt  = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

// ─── Models ──────────────────────────────────────────────────
const User               = require('../models/User');
const PasswordResetOTP   = require('../models/PasswordResetOTP');
const SiteVisit          = require('../models/SiteVisit');
const Lead               = require('../models/Lead');
const Notification       = require('../models/Notification');
const Activity           = require('../models/Activity');
const Followup           = require('../models/Followup');
const Booking            = require('../models/Booking');
const AuditLog           = require('../models/AuditLog');
const DuplicateAttemptLog= require('../models/DuplicateAttemptLog');
const LoginLog           = require('../models/LoginLog');
const Customer           = require('../models/Customer');
const Opportunity        = require('../models/Opportunity');
const DailyReport        = require('../models/DailyReport');

// ─── Employee roster (no passwords here) ─────────────────────
const EMPLOYEES = [
  { name: 'Subhashree Mohanty',    email: 'subhashree.omvik@gmail.com', employeeId: 'OMVR-E26-SBD001' },
  { name: 'Ashalata Nahak',        email: 'ashalata.omvik@gmail.com',   employeeId: 'OMVR-E26-SBD002' },
  { name: 'Sruti Sagarika Behera', email: 'sruti.omvik@gmail.com',      employeeId: 'OMVR-E26-SBD003' },
  { name: 'Jagruti Goudu',         email: 'jagruti.omvik@gmail.com',    employeeId: 'OMVR-E26-SBD004' },
  { name: 'Kisen Kaneheya Sahu',   email: 'kishan.omvik@gmail.com',     employeeId: 'OMVR-E26-SBD006' },
];

// ─── Load passwords from local gitignored JSON ────────────────
function loadPasswords() {
  const pwFile = path.join(__dirname, 'employee-passwords.json');
  if (!fs.existsSync(pwFile)) {
    console.error(
      '\n❌  ERROR: scripts/employee-passwords.json not found.\n' +
      '    Create it locally (it is gitignored) with the structure:\n' +
      '    { "OMVR-E26-SBD001": "...", "OMVR-E26-SBD002": "...", ... }\n'
    );
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(pwFile, 'utf-8'));
}

// ─── Main ─────────────────────────────────────────────────────
async function main() {
  if (!process.env.MONGO_URI) {
    console.error('❌  MONGO_URI is missing in .env — aborting.');
    process.exit(1);
  }

  const passwords = loadPasswords();

  // Validate all 5 passwords exist before touching the DB
  for (const emp of EMPLOYEES) {
    if (!passwords[emp.employeeId] || !passwords[emp.employeeId].trim()) {
      console.error(`❌  No password found for ${emp.employeeId} (${emp.name}) in employee-passwords.json`);
      process.exit(1);
    }
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('\n🔌  Connected to MongoDB');

  // ── STEP 1: Full wipe of all user-referencing collections ───
  console.log('\n🧹  Wiping all users and dependent records...');

  const results = await Promise.allSettled([
    PasswordResetOTP.deleteMany({}),
    SiteVisit.deleteMany({}),
    Lead.deleteMany({}),
    Notification.deleteMany({}),
    Activity.deleteMany({}),
    Followup.deleteMany({}),
    Booking.deleteMany({}),
    AuditLog.deleteMany({}),
    DuplicateAttemptLog.deleteMany({}),
    LoginLog.deleteMany({}),
    Customer.deleteMany({}),
    Opportunity.deleteMany({}),
    DailyReport.deleteMany({}),
    User.deleteMany({}),   // Must come LAST so FK-style refs are gone first
  ]);

  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.warn(`  ⚠️  Collection wipe #${i} failed (non-fatal):`, r.reason?.message);
    }
  });

  const collectionNames = [
    'PasswordResetOTPs', 'SiteVisits', 'Leads', 'Notifications',
    'Activities', 'Followups', 'Bookings', 'AuditLogs',
    'DuplicateAttemptLogs', 'LoginLogs', 'Customers', 'Opportunities',
    'DailyReports', 'Users'
  ];
  results.forEach((r, i) => {
    const count = r.value?.deletedCount ?? '(failed)';
    console.log(`  Deleted ${String(count).padStart(4)} — ${collectionNames[i]}`);
  });

  // ── STEP 2: Seed the 5 real employees ────────────────────────
  console.log('\n👥  Seeding 5 Telesales Executives...\n');

  for (const emp of EMPLOYEES) {
    const rawPw = passwords[emp.employeeId].trim();

    // Complexity gate — catch config mistakes early
    const ok =
      rawPw.length >= 7 &&
      /[A-Z]/.test(rawPw) &&
      /[a-z]/.test(rawPw) &&
      /[0-9]/.test(rawPw) &&
      /[^A-Za-z0-9]/.test(rawPw);

    if (!ok) {
      console.error(
        `❌  Password for ${emp.employeeId} does not meet complexity requirements.\n` +
        '    Need ≥7 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char.'
      );
      await mongoose.disconnect();
      process.exit(1);
    }

    const hashed = await bcrypt.hash(rawPw, 12);

    await User.create({
      name:              emp.name,
      email:             emp.email.toLowerCase().trim(),
      password:          hashed,
      role:              'telecaller',
      jobRole:           'Telesales Executive',
      employeeId:        emp.employeeId,
      isActive:          true,
      mustChangePassword: false,
    });

    // NEVER log the plaintext password — only confirm the employee was created
    console.log(`  ✅  ${emp.employeeId}  ${emp.name.padEnd(26)}  ${emp.email}`);
  }

  // ── STEP 3: Verify ────────────────────────────────────────────
  const count = await User.countDocuments();
  console.log(`\n✔   Total users in DB after seeding: ${count}`);
  if (count !== EMPLOYEES.length) {
    console.error(`⚠️  Expected ${EMPLOYEES.length}, got ${count} — check for duplicates or errors above.`);
  }

  console.log('\n🎉  Seed complete. Database is clean with only the 5 real employees.\n');
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('\n❌  Seed script failed:', err.message || err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
