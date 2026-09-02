const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const realEmployees = [
  { name: "Subhashree Mohanty",     employeeId: "OMVR-E26-SBD001", email: "subhashree.omvik@gmail.com" },
  { name: "Ashalata Nahak",         employeeId: "OMVR-E26-SBD002", email: "ashalata.omvik@gmail.com" },
  { name: "Sruti Sagarika Behera", employeeId: "OMVR-E26-SBD003", email: "sruti.omvik@gmail.com" },
  { name: "Jagruti Goudu",          employeeId: "OMVR-E26-SBD004", email: "jagruti.omvik@gmail.com" },
  { name: "Kisen Kaneheya Sahu",   employeeId: "OMVR-E26-SBD006", email: "kishan.omvik@gmail.com" },
];

const officialAdmins = [
  'admin@omvik.com',
  'aparna@omvikrealcon.com',
  'barsha@omvikrealcon.com',
  'admin3@omvikrealcon.com',
  'admin4@omvikrealcon.com'
];

async function sync() {
  if (!process.env.MONGO_URI) {
    console.error('ERROR: MONGO_URI is missing in .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('=== SYNCING OFFICIAL REAL EMPLOYEES & CREATING ACCOUNTS ===\n');

  const defaultHashedPassword = await bcrypt.hash("password123", 12);

  for (const emp of realEmployees) {
    let user = await User.findOne({
      $or: [{ email: emp.email }, { employeeId: emp.employeeId }]
    });

    if (user) {
      user.name = emp.name;
      user.email = emp.email;
      user.employeeId = emp.employeeId;
      user.role = 'telecaller';
      user.password = defaultHashedPassword;
      user.isActive = true;
      await user.save();
      console.log(`Updated real employee account: [${emp.employeeId}] ${emp.name} -> ${emp.email}`);
    } else {
      await User.create({
        name: emp.name,
        email: emp.email,
        password: defaultHashedPassword,
        role: "telecaller",
        employeeId: emp.employeeId,
        mustChangePassword: false,
        isActive: true,
      });
      console.log(`Created real employee account: [${emp.employeeId}] ${emp.name} -> ${emp.email}`);
    }
  }

  // Print final official user directory
  const finalUsers = await User.find({}).sort({ employeeId: 1 });
  console.log('\n=== OFFICIAL EMPLOYEE DIRECTORY ===');
  finalUsers.forEach((u) => {
    console.log(` - [${u.employeeId || 'SYS'}] ${u.name.padEnd(25)} (${u.email}) - ${u.role}`);
  });

  console.log('\n✅ EMPLOYEE DATABASE RESTORATION COMPLETE! All employee accounts ready with password123.');
  await mongoose.disconnect();
}

sync().catch(console.error);
