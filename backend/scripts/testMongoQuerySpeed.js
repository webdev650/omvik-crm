const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

async function testQuerySpeed() {
  console.log('Connecting to MongoDB Atlas...');
  const startConn = Date.now();
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Connected to MongoDB Atlas in ${Date.now() - startConn}ms`);

  const cleanInput = 'omvikrealcon@gmail.com';
  const startQuery1 = Date.now();
  
  console.log('Query 1: Exact email match only...');
  const u1 = await User.findOne({ email: cleanInput });
  console.log(`Query 1 completed in ${Date.now() - startQuery1}ms:`, u1 ? u1.email : 'null');

  const startQuery2 = Date.now();
  console.log('Query 2: $or with email and regex name...');
  const u2 = await User.findOne({
    $or: [
      { email: cleanInput },
      { name: new RegExp(`^${cleanInput}$`, 'i') }
    ]
  });
  console.log(`Query 2 completed in ${Date.now() - startQuery2}ms:`, u2 ? u2.email : 'null');

  await mongoose.disconnect();
}

testQuerySpeed().catch(console.error);
