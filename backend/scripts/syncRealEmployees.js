require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const realEmployees = [
  { name: "Subhashree Mohanty",     employeeId: "OMVR-E26-SBD001", email: "subhashree.omvik@gmail.com" },
  { name: "Ashalata Nahak",         employeeId: "OMVR-E26-SBD002", email: "ashalata.omvik@gmail.com" },
  { name: "Sruti Sagarika Behera", employeeId: "OMVR-E26-SBD003", email: "jagruti.omvik@gmail.com" },
  { name: "Jagruti Goudu",          employeeId: "OMVR-E26-SBD004", email: "sruti.omvik@gmail.com" },
  { name: "Kisen Kaneheya Sahu",   employeeId: "OMVR-E26-SBD006", email: "kishan.omvik@gmail.com" },
];

const officialAdmins = [
  'admin@omvik.com',
  'aparna@omvikrealcon.com',
  'barsha@omvikrealcon.com',
  'admin3@omvikrealcon.com'
];

async function sync() {
  if (!process.env.MONGO_URI) {
    console.error('ERROR: MONGO_URI is missing in .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('=== SYNCING OFFICIAL REAL EMPLOYEES & CLEANING TEST USERS ===\n');

  // 1. Assign temporary placeholder emails to avoid unique index conflict during swap
  for (const emp of realEmployees) {
    await User.updateOne(
      { employeeId: emp.employeeId },
      { $set: { email: `temp_${emp.employeeId.toLowerCase()}@omvik.com` } }
    );
  }

  // 2. Update real employees with exact requested email & name pairings
  for (const emp of realEmployees) {
    let user = await User.findOne({ employeeId: emp.employeeId });

    if (user) {
      user.name = emp.name;
      user.email = emp.email;
      user.role = 'telecaller';
      user.isActive = true;
      await user.save();
      console.log(`Updated real employee: [${emp.employeeId}] ${emp.name} -> ${emp.email}`);
    } else {
      const tempPassword = Math.random().toString(36).slice(-10);
      const hashed = await bcrypt.hash(tempPassword, 12);

      await User.create({
        name: emp.name,
        email: emp.email,
        password: hashed,
        role: "telecaller",
        employeeId: emp.employeeId,
        mustChangePassword: true,
        isActive: true,
      });
      console.log(`Created real employee: [${emp.employeeId}] ${emp.name} -> ${emp.email}`);
    }
  }

  // 3. Delete all test/fake accounts not in officialAdmins or realEmployees
  const allowedEmails = [
    ...officialAdmins,
    ...realEmployees.map(e => e.email)
  ];

  const deleteResult = await User.deleteMany({
    email: { $nin: allowedEmails }
  });

  console.log(`\nRemoved ${deleteResult.deletedCount} test/fake accounts.`);

  // 4. Print final official user list
  const finalUsers = await User.find({}).sort({ employeeId: 1 });
  console.log('\n=== OFFICIAL EMPLOYEE DIRECTORY ===');
  finalUsers.forEach((u) => {
    console.log(` - [${u.employeeId || 'SYS'}] ${u.name.padEnd(25)} (${u.email}) - ${u.role}`);
  });

  console.log('\n✅ DATABASE SYNC COMPLETE!');
  await mongoose.disconnect();
}

sync().catch(console.error);
