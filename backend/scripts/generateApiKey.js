require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');
const ApiKey = require('../models/ApiKey');

async function generateApiKey() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('=== GENERATING OFFICIAL WEBSITE API KEY ===\n');

  const rawKey = `omvik_live_${crypto.randomBytes(24).toString('hex')}`;
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  const apiKeyDoc = await ApiKey.create({
    name: 'omvik-website-official',
    keyHash,
    isActive: true
  });

  console.log('✅ API KEY GENERATED SUCCESSFULLY:');
  console.log(`   Key Name: ${apiKeyDoc.name}`);
  console.log(`   PLAINTEXT API KEY: ${rawKey}`);
  console.log('   (Include header: x-api-key: ' + rawKey + ')\n');

  await mongoose.disconnect();
}

generateApiKey().catch(console.error);
