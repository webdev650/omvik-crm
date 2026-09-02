const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

async function cleanTestData() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is missing from environment');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('=== PRODUCTION DATABASE CLEANUP & RESET SCRIPT ===\n');

  const db = mongoose.connection.db;

  // 1. Clean Test Users (Keep ONLY official admin & employee emails)
  const officialEmails = [
    'admin@omvik.com',
    'aparna@omvikrealcon.com',
    'barsha@omvikrealcon.com',
    'admin3@omvikrealcon.com',
    'admin4@omvikrealcon.com',
    'subhashree.omvik@gmail.com',
    'ashalata.omvik@gmail.com',
    'sruti.omvik@gmail.com',
    'jagruti.omvik@gmail.com',
    'kishan.omvik@gmail.com'
  ];

  console.log('1. Cleaning temporary test user accounts...');
  const userDeleteResult = await db.collection('users').deleteMany({
    email: { $nin: officialEmails }
  });
  console.log(`   Deleted ${userDeleteResult.deletedCount} temporary test users.`);

  // Verify remaining real admins & staff
  const remainingUsers = await db.collection('users').find({}, { projection: { email: 1, name: 1, role: 1, employeeId: 1 } }).toArray();
  console.log('   Remaining Official Users:');
  remainingUsers.forEach(u => console.log(`   - [${u.employeeId || 'SYS'}] ${u.name} (${u.email}) - ${u.role}`));

  // 2. Wipe Test Transactional Collections
  const collectionsToWipe = [
    'opportunities',
    'customers',
    'leads',
    'activities',
    'followups',
    'sitevisits',
    'dailyreports',
    'notifications',
    'auditlogs',
    'assignmenthistories',
    'duplicateattemptlogs',
    'leaves',
    'leadbatches'
  ];

  console.log('\n2. Wiping test transactional data collections...');
  for (const colName of collectionsToWipe) {
    try {
      const res = await db.collection(colName).deleteMany({});
      console.log(`   - ${colName.padEnd(25)} : Wiped ${res.deletedCount} test documents.`);
    } catch (e) {
      console.log(`   - ${colName.padEnd(25)} : Collection does not exist or empty.`);
    }
  }

  console.log('\n✅ PRODUCTION DATABASE CLEANUP COMPLETE. System is clean for live sales operations!');
  await mongoose.connection.close();
}

cleanTestData().catch(console.error);
