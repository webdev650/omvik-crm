require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const employees = [
  { id: "OMVR-E26-SBD001", name: "Subhashree Mohanty",     email: "subhashree.omvik@gmail.com" },
  { id: "OMVR-E26-SBD002", name: "Ashalata Nahak",         email: "ashalata.omvik@gmail.com" },
  { id: "OMVR-E26-SBD003", name: "Sruti Sagarika Behera", email: "jagruti.omvik@gmail.com" },
  { id: "OMVR-E26-SBD004", name: "Jagruti Goudu",          email: "sruti.omvik@gmail.com" },
  { id: "OMVR-E26-SBD006", name: "Kisen Kaneheya Sahu",   email: "kishan.omvik@gmail.com" },
];

async function resetPasswords() {
  if (!process.env.MONGO_URI) {
    console.error('ERROR: MONGO_URI missing in .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('=== SETTING CLEAN TEMPORARY PASSWORDS FOR EMPLOYEES ===\n');

  const defaultTempPassword = "password123";
  const hashed = await bcrypt.hash(defaultTempPassword, 12);

  for (const emp of employees) {
    const user = await User.findOne({ employeeId: emp.id });
    if (user) {
      user.password = hashed;
      user.mustChangePassword = true;
      user.isActive = true;
      await user.save();
      console.log(`Reset [${emp.id}] ${emp.name} (${emp.email}) -> Password: ${defaultTempPassword}`);
    }
  }

  console.log('\n✅ ALL PASSWORDS RESET TO Standard Temp Password!');
  await mongoose.disconnect();
}

resetPasswords().catch(console.error);
