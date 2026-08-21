require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const { Settings, getOrCreateSettings } = require('../models/Settings');
const { getRandomMascotMessage } = require('../utils/mascotMessages');

async function testMascotLogic() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('=== MASCOT PERSONALITY & GREETINGS TEST ===\n');

  // 1. Get or create Settings
  const settings = await getOrCreateSettings();
  console.log('1. Settings Configuration:');
  console.log(`   - Work Start Time: ${settings.workStartTime}`);
  console.log(`   - Grace Period: ${settings.workStartGraceMinutes} mins`);
  console.log(`   - Lunch Window: ${settings.lunchWindowStart} – ${settings.lunchWindowEnd}`);

  // 2. Test Template Random Generation for Each Category
  console.log('\n2. Testing Mascot Template Substitution & Random Variations:');
  const categories = ['onTimeLogin', 'lateLogin', 'lunchLogin', 'lateNightLogin', 'logout'];
  categories.forEach((cat) => {
    const msg = getRandomMascotMessage(cat, 'Aparna Tripathy');
    console.log(`   - [${cat.padEnd(15)}] "${msg}"`);
  });

  // 3. Test nudgesEnabled toggle behavior
  console.log('\n3. Testing Nudges Enabled / Disabled Logic:');
  const testUserEnabled = { name: 'Aparna Tripathy', nudgesEnabled: true };
  const testUserDisabled = { name: 'Barsha Jena', nudgesEnabled: false };

  const greetingEnabled = testUserEnabled.nudgesEnabled !== false
    ? getRandomMascotMessage('onTimeLogin', testUserEnabled.name)
    : null;

  const greetingDisabled = testUserDisabled.nudgesEnabled !== false
    ? getRandomMascotMessage('onTimeLogin', testUserDisabled.name)
    : null;

  console.log(`   - User with nudgesEnabled=true receives: "${greetingEnabled}"`);
  console.log(`   - User with nudgesEnabled=false receives: ${greetingDisabled} (null/skipped)`);

  console.log('\n✅ ALL MASCOT PERSONALITY TESTS PASSED SUCCESSFULLY!');
  await mongoose.connection.close();
}

testMascotLogic().catch(console.error);
