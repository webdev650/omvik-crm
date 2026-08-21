require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const employees = [
  { name: "Subhashree Mohanty",     employeeId: "OMVR-E26-SBD001", email: "subhashree.omvik@gmail.com" },
  { name: "Ashalata Nahak",         employeeId: "OMVR-E26-SBD002", email: "ashalata.omvik@gmail.com" },
  { name: "Sruti Sagarika Behera", employeeId: "OMVR-E26-SBD003", email: "sruti.omvik@gmail.com" },
  { name: "Jagruti Goudu",          employeeId: "OMVR-E26-SBD004", email: "jagruti.omvik@gmail.com" },
  { name: "Kisen Kaneheya Sahu",   employeeId: "OMVR-E26-SBD006", email: "kishan.omvik@gmail.com" },
];

async function seed() {
  if (!process.env.MONGO_URI) {
    console.error('ERROR: MONGO_URI is missing in .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('=== SEEDING TELECALLER EMPLOYEES ===\n');

  for (const emp of employees) {
    const exists = await User.findOne({
      $or: [{ email: emp.email }, { employeeId: emp.employeeId }]
    });

    if (exists) {
      console.log(`Skipped (already exists): ${emp.employeeId} — ${emp.email}`);
      continue;
    }

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

    console.log(`Created ${emp.employeeId} — ${emp.name} (${emp.email}) — temp password: ${tempPassword}`);
  }

  console.log('\n✅ SEEDING COMPLETE!');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  mongoose.disconnect();
});
