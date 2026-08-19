require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Counter = require('../models/Counter');

async function migrateExistingUsers() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB for Employee ID migration.');

  const users = await User.find({
    $or: [{ employeeId: { $exists: false } }, { employeeId: null }]
  });

  console.log(`Found ${users.length} users missing employeeId.`);

  for (const u of users) {
    const adminRoles = ['super_admin', 'director', 'admin', 'team_lead'];
    const prefix = adminRoles.includes(u.role) ? 'ADM' : 'EMP';
    const counterName = `user_id_${prefix.toLowerCase()}`;

    const counter = await Counter.findOneAndUpdate(
      { name: counterName },
      { $inc: { value: 1 } },
      { returnDocument: 'after', upsert: true }
    );

    u.employeeId = `${prefix}-${String(counter.value).padStart(3, '0')}`;
    await u.save();
    console.log(`Assigned ${u.email} -> ${u.employeeId}`);
  }

  await mongoose.connection.close();
  console.log('Employee ID migration complete.');
}

migrateExistingUsers().catch(console.error);
