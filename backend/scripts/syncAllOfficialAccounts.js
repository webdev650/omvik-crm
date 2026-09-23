require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');

const officialAccounts = [
  // 📞 Staff Telecallers
  {
    employeeId: 'OMVR-E26-SBD001',
    name: 'Subhashree Mohanty',
    email: 'subhashree.omvik@gmail.com',
    role: 'telecaller'
  },
  {
    employeeId: 'OMVR-E26-SBD002',
    name: 'Ashalata Nahak',
    email: 'ashalata.omvik@gmail.com',
    role: 'telecaller'
  },
  {
    employeeId: 'OMVR-E26-SBD003',
    name: 'Sruti Sagarika Behera',
    email: 'sruti.omvik@gmail.com',
    role: 'telecaller'
  },
  {
    employeeId: 'OMVR-E26-SBD004',
    name: 'Jagruti Goudu',
    email: 'jagruti.omvik@gmail.com',
    role: 'telecaller'
  },
  {
    employeeId: 'OMVR-E26-SBD006',
    name: 'Kisen Kaneheya Sahu',
    email: 'kishan.omvik@gmail.com',
    role: 'telecaller'
  },

  // 🛡️ Official Admin & Management Accounts
  {
    employeeId: 'ADM-005',
    name: 'Aparna Tripathy',
    email: 'aparna@omvikrealcon.com',
    role: 'super_admin'
  },
  {
    employeeId: 'ADM-006',
    name: 'Barsha Rani Jena',
    email: 'barsha@omvikrealcon.com',
    role: 'admin'
  },
  {
    employeeId: 'ADM-007',
    name: 'Omvik Director',
    email: 'admin3@omvikrealcon.com',
    role: 'director'
  },
  {
    employeeId: 'ADM-003',
    name: 'System Admin',
    email: 'admin@omvik.com',
    role: 'admin'
  }
];

async function syncAccounts() {
  console.log('----------------------------------------------------');
  console.log('🔒 SYNCING OFFICIAL ACCOUNTS & PASSWORDS IN MONGODB');
  console.log('----------------------------------------------------\n');

  await connectDB();

  const passwordHash = await bcrypt.hash('password123', 10);
  const syncedList = [];

  for (const acc of officialAccounts) {
    let user = await User.findOne({
      $or: [{ email: acc.email.toLowerCase() }, { employeeId: acc.employeeId }]
    });

    if (user) {
      user.name = acc.name;
      user.email = acc.email.toLowerCase();
      user.employeeId = acc.employeeId;
      user.role = acc.role;
      user.password = passwordHash;
      user.isActive = true;
      user.mustChangePassword = false;
      user.failedLoginAttempts = 0;
      user.lockoutUntil = null;
      await user.save();
      syncedList.push({ ...acc, status: 'UPDATED' });
    } else {
      user = await User.create({
        name: acc.name,
        email: acc.email.toLowerCase(),
        employeeId: acc.employeeId,
        role: acc.role,
        password: passwordHash,
        isActive: true,
        mustChangePassword: false,
        failedLoginAttempts: 0,
        lockoutUntil: null
      });
      syncedList.push({ ...acc, status: 'CREATED' });
    }
  }

  console.log('====================================================');
  console.log('📋 OFFICIAL ACCOUNTS SYNC REPORT');
  console.log('====================================================');
  syncedList.forEach((acc, i) => {
    console.log(
      `${i + 1}. [${acc.employeeId}] ${acc.name.padEnd(22)} | Email: ${acc.email.padEnd(25)} | Role: ${acc.role.padEnd(12)} | Password: password123 [${acc.status}]`
    );
  });
  console.log('====================================================\n');

  console.log('🎉 All official staff and admin accounts synced successfully.');
  await mongoose.connection.close();
}

syncAccounts().catch(async (err) => {
  console.error('❌ Sync Accounts Error:', err);
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  process.exit(1);
});
