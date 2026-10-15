const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 20
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Fatal MongoDB Connection Error: ${error.message}`);

    // In production, never fall back to an in-memory database or seed fake users
    if (process.env.NODE_ENV === 'production') {
      console.error('Fatal: Cannot connect to primary MongoDB instance in production. Exiting...');
      process.exit(1);
    }

    // Local development fallback only
    console.warn('[Development Only] Falling back to local MongoMemoryServer...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const uri = mongod.getUri();
      const conn = await mongoose.connect(uri);
      console.log(`[MongoMemoryServer Active] Connected at: ${conn.connection.host}`);
    } catch (fallbackErr) {
      console.error(`Fatal DB Connection Error: ${fallbackErr.message}`);
      process.exit(1);
    }
  }
};

module.exports = connectDB;

