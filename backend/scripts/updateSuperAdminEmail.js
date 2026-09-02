const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

async function updateAdmin() {
  await mongoose.connect(process.env.MONGO_URI);

  // Update Aparna / Super Admin account email OR ensure omvikrealcon@gmail.com exists
  const aparna = await User.findOne({ email: 'aparna@omvikrealcon.com' });
  if (aparna) {
    console.log('Found Super Admin:', aparna.name, aparna.email);
  }

  // Also check if omvikrealcon@gmail.com user exists
  let omvikUser = await User.findOne({ email: 'omvikrealcon@gmail.com' });
  if (!omvikUser) {
    console.log('Creating omvikrealcon@gmail.com account in MongoDB...');
    const count = await User.countDocuments();
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('password123', 10);

    omvikUser = await User.create({
      name: 'OMVIK Admin',
      email: 'omvikrealcon@gmail.com',
      password: hashedPassword,
      role: 'super_admin',
      employeeId: `EMP-${String(count + 1).padStart(3, '0')}`,
      isActive: true
    });
    console.log('Created Super Admin user for omvikrealcon@gmail.com!');
  } else {
    console.log('omvikrealcon@gmail.com already exists in MongoDB.');
  }

  await mongoose.disconnect();
}

updateAdmin().catch(console.error);
