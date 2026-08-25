require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function resetAllPasswords() {
  if (!process.env.MONGO_URI) {
    console.error('ERROR: MONGO_URI missing in .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('=== SETTING CLEAN PASSWORDS (password123) FOR ALL SYSTEM ACCOUNTS ===\n');

  const defaultPassword = "password123";
  const hashed = await bcrypt.hash(defaultPassword, 12);

  const users = await User.find({});
  for (const user of users) {
    user.password = hashed;
    // Set mustChangePassword to false for demo admin accounts (Aparna, Barsha, Admin)
    if (['aparna@omvikrealcon.com', 'barsha@omvikrealcon.com', 'admin@omvik.com'].includes(user.email)) {
      user.mustChangePassword = false;
    }
    user.isActive = true;
    await user.save();
    console.log(`✓ Reset [${user.employeeId || 'SYS'}] ${user.name} (${user.email}) -> Password: ${defaultPassword} (mustChangePassword: ${user.mustChangePassword})`);
  }

  console.log('\n✅ ALL SYSTEM PASSWORDS SUCCESSFULLY RESET TO password123!');
  await mongoose.disconnect();
  process.exit(0);
}

resetAllPasswords().catch(console.error);
