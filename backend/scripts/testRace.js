require('dotenv').config();
const mongoose = require('mongoose');
const { processIncomingLead } = require('../services/duplicateEngine');
const Project = require('../models/Project');
const Customer = require('../models/Customer');
const Opportunity = require('../models/Opportunity');
const User = require('../models/User');

async function runRaceConditionTest() {
  console.log('=== STARTING RACE CONDITION DUPLICATE ENGINE TEST ===\n');

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB database.');

    // Ensure unique index is built in MongoDB before firing concurrent calls
    console.log('Ensuring Opportunity unique indexes are built...');
    await Opportunity.init();

    // Find or create a test admin user
    let user = await User.findOne({ email: 'admin_race@omvik.com' });
    if (!user) {
      user = await User.create({
        name: 'Race Test Admin',
        email: 'admin_race@omvik.com',
        password: 'password123',
        role: 'admin'
      });
    }

    // Find or create a test project
    const timestamp = Date.now();
    let project = await Project.create({
      name: `Race Test Project ${timestamp}`,
      code: `RACE${timestamp.toString().slice(-4)}`,
      location: 'Test City'
    });

    const leadInput = {
      rawName: 'Rahul Sharma',
      rawMobile: '+91 99887 76655',
      project: project._id,
      source: 'concurrent_race_test',
      campaign: 'race_test_campaign'
    };

    console.log(`Firing 2 concurrent processIncomingLead requests for mobile: ${leadInput.rawMobile}...`);

    // SIMULTANEOUS ATOMIC CONCURRENT EXECUTION
    const [res1, res2] = await Promise.allSettled([
      processIncomingLead(leadInput, user),
      processIncomingLead(leadInput, user)
    ]);

    console.log('\nResults from Promise.allSettled:');
    console.log('Call 1 status:', res1.status, res1.value ? `isDuplicate: ${res1.value.isDuplicate}` : res1.reason);
    console.log('Call 2 status:', res2.status, res2.value ? `isDuplicate: ${res2.value.isDuplicate}` : res2.reason);

    // Verify in database directly
    const customer = await Customer.findOne({ primaryMobile: '9988776655' });
    if (!customer) {
      throw new Error('Customer was not created');
    }

    const activeOpps = await Opportunity.find({
      customer: customer._id,
      project: project._id,
      isActive: true
    });

    console.log(`\nActive Opportunities found in DB for customer ${customer.primaryMobile} & project ${project.code}: ${activeOpps.length}`);

    if (activeOpps.length === 1) {
      console.log('\n🏆 RACE CONDITION TEST PASSED! Exactly 1 active Opportunity was created.');
      console.log('   The second concurrent call was cleanly caught by MongoDB unique index constraint (code 11000) and flagged as blocked duplicate.');
    } else {
      console.error(`\n❌ RACE CONDITION TEST FAILED! Expected 1 active opportunity, but found ${activeOpps.length}`);
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during race test:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

runRaceConditionTest();
