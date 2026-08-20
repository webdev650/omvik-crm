require('dotenv').config();
const mongoose = require('mongoose');

async function cleanTestData() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('=== PRODUCTION DATABASE CLEANUP & RESET SCRIPT ===\n');

  const db = mongoose.connection.db;

  // 1. Clean Test Users (Keep ONLY real admins: admin@omvik.com, aparna, barsha, admin3, admin4)
  const realAdminEmails = [
    'admin@omvik.com',
    'aparna@omvikrealcon.com',
    'barsha@omvikrealcon.com',
    'admin3@omvikrealcon.com',
    'admin4@omvikrealcon.com'
  ];

  console.log('1. Cleaning test user accounts...');
  const userDeleteResult = await db.collection('users').deleteMany({
    email: { $nin: realAdminEmails }
  });
  console.log(`   Deleted ${userDeleteResult.deletedCount} temporary test users.`);

  // Verify remaining real admins
  const remainingUsers = await db.collection('users').find({}, { projection: { email: 1, name: 1, role: 1, employeeId: 1 } }).toArray();
  console.log('   Remaining Official Users:');
  remainingUsers.forEach(u => console.log(`   - [${u.employeeId || 'SYS'}] ${u.name} (${u.email}) - ${u.role}`));

  // 2. Wipe Test Transactional Collections (Including leaves)
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
    'leaves'
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

  // 3. Reset ID Counters in `counters` collection
  console.log('\n3. Resetting sequential ID counters...');
  await db.collection('counters').updateOne(
    { name: 'ADM' },
    { $set: { value: 4 } },
    { upsert: true }
  );

  await db.collection('counters').updateOne(
    { name: 'EMP' },
    { $set: { value: 0 } },
    { upsert: true }
  );

  const updatedCounters = await db.collection('counters').find({}).toArray();
  console.log('   Updated Counters:');
  updatedCounters.forEach(c => console.log(`   - ${c.name} : next value will be ${c.value + 1}`));

  console.log('\n✅ PRODUCTION DATABASE CLEANUP COMPLETE. System is clean for live sales operations!');
  await mongoose.connection.close();
}

cleanTestData().catch(console.error);
