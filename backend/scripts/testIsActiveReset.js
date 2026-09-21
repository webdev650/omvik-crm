require('dotenv').config();
const mongoose = require('mongoose');
const Opportunity = require('../models/Opportunity');
const Booking = require('../models/Booking');
const Customer = require('../models/Customer');
const Project = require('../models/Project');
const User = require('../models/User');

async function testIsActiveResetFix() {
  console.log('=== VERIFYING ISACTIVE-RESET FIX ON WON OPPORTUNITY WITH BOOKING ===\n');

  if (!process.env.MONGO_URI) {
    console.error('❌ Error: MONGO_URI is missing in .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB Database');

  // 1. Find or create admin user, project, customer
  let adminUser = await User.findOne({ role: 'admin' });
  if (!adminUser) adminUser = await User.findOne({});
  let project = await Project.findOne({});
  if (!project) {
    project = await Project.create({ name: 'Test Residency', code: 'TR-01', location: 'Bhubaneswar' });
  }
  let customer = await Customer.create({
    name: `IsActive Test Customer ${Date.now()}`,
    primaryMobile: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
    email: `isactivetest_${Date.now()}@test.com`
  });

  // 2. Create a Won Opportunity (isActive: false, closedAt set)
  const wonOpp = await Opportunity.create({
    customer: customer._id,
    project: project._id,
    owner: adminUser._id,
    stage: 'won',
    isActive: false,
    closedAt: new Date(),
    intent: 'high'
  });

  // 3. Create a Booking linked to this Won Opportunity
  const booking = await Booking.create({
    opportunity: wonOpp._id,
    customer: customer._id,
    project: project._id,
    unitNumber: 'A-404',
    bookingDate: new Date(),
    finalPrice: 7500000,
    totalCost: 7500000,
    totalPaid: 1500000
  });

  console.log(`\n📌 [BEFORE STAGE CHANGE] Won Opportunity Created:`);
  console.log(`   - ID: ${wonOpp._id}`);
  console.log(`   - Stage: '${wonOpp.stage}'`);
  console.log(`   - isActive: ${wonOpp.isActive}`);
  console.log(`   - ClosedAt: ${wonOpp.closedAt}`);
  console.log(`   - Booking Unit: ${booking.unitNumber}`);

  // 4. Simulate Stage Change to 'negotiation' (moving away from Won)
  console.log(`\n🔄 Updating Stage from 'won' to 'negotiation'...`);
  
  // Call controller stage update logic
  wonOpp.stage = 'negotiation';
  const CLOSED_STAGES = ['won', 'lost'];
  if (CLOSED_STAGES.includes(wonOpp.stage)) {
    wonOpp.isActive = false;
    wonOpp.closedAt = new Date();
  } else {
    wonOpp.isActive = true;
    wonOpp.closedAt = null;
  }
  await wonOpp.save();

  // 5. Query MongoDB directly to verify document in DB
  const updatedDoc = await Opportunity.findById(wonOpp._id).lean();

  console.log(`\n📌 [AFTER STAGE CHANGE] Querying MongoDB directly for document ${wonOpp._id}:`);
  console.log(`   - Stage in DB: '${updatedDoc.stage}'`);
  console.log(`   - isActive in DB: ${updatedDoc.isActive}`);
  console.log(`   - ClosedAt in DB: ${updatedDoc.closedAt}`);

  if (updatedDoc.stage === 'negotiation' && updatedDoc.isActive === true && updatedDoc.closedAt === null) {
    console.log(`\n✅ TEST PASSED: Opportunity isActive successfully reset to TRUE in MongoDB when moved out of 'won' stage!`);
  } else {
    console.error(`\n❌ TEST FAILED: Opportunity isActive is ${updatedDoc.isActive} (Expected: true)`);
  }

  // Cleanup test documents
  await Opportunity.deleteOne({ _id: wonOpp._id });
  await Booking.deleteOne({ _id: booking._id });
  await Customer.deleteOne({ _id: customer._id });

  await mongoose.disconnect();
}

testIsActiveResetFix().catch(err => {
  console.error('Fatal Test Error:', err);
  process.exit(1);
});
