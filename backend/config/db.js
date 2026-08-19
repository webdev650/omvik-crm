const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const connectDB = async () => {
  try {
    // Attempt connecting to configured MONGO_URI with 4s timeout
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 4000
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`[Atlas Connect Notice] Primary Mongo URI connection failed (${error.message}). Falling back to MongoMemoryServer...`);

    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const uri = mongod.getUri();
      const conn = await mongoose.connect(uri);
      console.log(`[MongoMemoryServer Active] Connected at: ${conn.connection.host}`);

      // Seed fallback admin user and test data for seamless local execution
      const User = require('../models/User');
      const Project = require('../models/Project');

      const adminEmail = 'admin@omvik.com';
      const adminPwd = await bcrypt.hash('password123', 10);
      let admin = await User.findOne({ email: adminEmail });
      if (!admin) {
        await User.create({
          name: 'System Admin',
          email: adminEmail,
          password: adminPwd,
          role: 'admin',
          isActive: true
        });
        console.log('[Fallback Seed] Seeded admin@omvik.com / password123');
      }

      const teleEmail = 'tele1_bulk_1787033936416@omvik.com';
      const telePwd = await bcrypt.hash('testpass123', 10);
      let tele = await User.findOne({ email: teleEmail });
      if (!tele) {
        await User.create({
          name: 'Telecaller Alpha',
          email: teleEmail,
          password: telePwd,
          role: 'telecaller',
          isActive: true
        });
        console.log('[Fallback Seed] Seeded Telecaller Alpha (tele1_bulk_1787033936416@omvik.com / testpass123)');
      }

      let proj = await Project.findOne();
      if (!proj) {
        await Project.create({
          name: 'Omvik Grand Residency',
          code: 'OGR-001',
          location: 'Bhubaneswar, Odisha',
          type: 'residential',
          isActive: true
        });
        console.log('[Fallback Seed] Seeded project Omvik Grand Residency');
      }

    } catch (fallbackErr) {
      console.error(`Fatal DB Connection Error: ${fallbackErr.message}`);
      process.exit(1);
    }
  }
};

module.exports = connectDB;
