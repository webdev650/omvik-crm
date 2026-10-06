const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const employees = [
  {
    employeeId: "OMVR-E26-SBD001",
    name: "Subhashree Mohanty",
    email: "subhashree.omvik@gmail.com",
    password: "Omvik@54321",
    jobRole: "Telesales Executive",
    role: "telecaller"
  },
  {
    employeeId: "OMVR-E26-SBD002",
    name: "Ashalata Nahak",
    email: "ashalata.omvik@gmail.com",
    password: "Omvik@002",
    jobRole: "Telesales Executive",
    role: "telecaller"
  },
  {
    employeeId: "OMVR-E26-SBD003",
    name: "Sruti Sagarika Behera",
    email: "sruti.omvik@gmail.com",
    password: "Omvik@003",
    jobRole: "Telesales Executive",
    role: "telecaller"
  },
  {
    employeeId: "OMVR-E26-SBD004",
    name: "Jagruti Goudu",
    email: "jagruti.omvik@gmail.com",
    password: "Omvik@004",
    jobRole: "Telesales Executive",
    role: "telecaller"
  },
  {
    employeeId: "OMVR-E26-SBD006",
    name: "Kisen Kaneheya Sahu",
    email: "kishan.omvik@gmail.com",
    password: "Omvik@4321",
    jobRole: "Telesales Executive",
    role: "telecaller"
  }
];

async function syncCredentials() {
  if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI missing in backend/.env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('🔌 Connected to MongoDB. Syncing employee credentials...\n');

  for (const emp of employees) {
    const hashed = await bcrypt.hash(emp.password, 12);
    
    let user = await User.findOne({
      $or: [{ email: emp.email }, { employeeId: emp.employeeId }]
    });

    if (user) {
      user.name = emp.name;
      user.email = emp.email;
      user.employeeId = emp.employeeId;
      user.jobRole = emp.jobRole;
      user.role = emp.role;
      user.password = hashed;
      user.isActive = true;
      await user.save();
      console.log(`✅ Updated: [${emp.employeeId}] ${emp.name} (${emp.email})`);
    } else {
      await User.create({
        name: emp.name,
        email: emp.email,
        employeeId: emp.employeeId,
        password: hashed,
        jobRole: emp.jobRole,
        role: emp.role,
        isActive: true
      });
      console.log(`✅ Created: [${emp.employeeId}] ${emp.name} (${emp.email})`);
    }
  }

  console.log('\n🎉 Employee account sync complete!');
  await mongoose.disconnect();
}

syncCredentials().catch(err => {
  console.error('❌ Sync failed:', err);
  mongoose.disconnect();
});
