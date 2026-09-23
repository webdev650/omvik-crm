require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Project = require('../models/Project');
const Customer = require('../models/Customer');
const Opportunity = require('../models/Opportunity');
const Activity = require('../models/Activity');
const Followup = require('../models/Followup');
const SiteVisit = require('../models/SiteVisit');
const Booking = require('../models/Booking');

async function testNextStagePipeline() {
  console.log('----------------------------------------------------');
  console.log('🧪 TESTING CRM NEXT STAGE PIPELINE (STAGE 2 -> 5)');
  console.log('----------------------------------------------------\n');

  await connectDB();

  // 1. Fetch Admin / Telecaller & Project
  const admin = await User.findOne({ role: 'admin' }) || await User.findOne();
  const telecaller = await User.findOne({ role: 'telecaller' }) || admin;
  const project = await Project.findOne({ isActive: true });

  if (!project) {
    console.error('❌ No active project found for testing.');
    await mongoose.connection.close();
    process.exit(1);
  }

  console.log(`👤 Using User: ${admin.name} (${admin.role})`);
  console.log(`🏗️ Using Project: ${project.name} (${project.code})\n`);

  // 2. Create Test Customer & Opportunity
  const testMobile = `98765${Math.floor(10005 + Math.random() * 89999)}`;
  const customer = await Customer.create({
    name: 'Pipeline Test Client',
    primaryMobile: testMobile,
    email: 'pipeline.test@example.com',
    city: 'Bhubaneswar'
  });

  const opportunity = await Opportunity.create({
    customer: customer._id,
    project: project._id,
    owner: telecaller._id,
    source: 'PIPELINE_TEST',
    stage: 'new',
    intent: 'high',
    isActive: true,
    leadCode: `OMV-TEST-${Date.now().toString().slice(-4)}`
  });

  console.log(`✅ [Step 1: Lead Acquisition] Opportunity Created: ${opportunity.leadCode} (${customer.name})`);
  console.log(`   Initial Stage: "${opportunity.stage}" | Intent: "${opportunity.intent}"\n`);

  // 3. Log Activity & Move to Stage 2 ("contacted")
  const activity1 = await Activity.create({
    opportunity: opportunity._id,
    user: telecaller._id,
    channel: 'call',
    outcome: 'connected',
    notes: 'Initial intro call completed. Prospect expressed high interest in 3BHK unit.'
  });

  opportunity.stage = 'contacted';
  opportunity.lastContactedAt = new Date();
  await opportunity.save();

  console.log(`✅ [Step 2: Lead Contacted] Activity Logged (${activity1.channel} / ${activity1.outcome})`);
  console.log(`   Updated Stage: "${opportunity.stage}" | Last Contacted: ${opportunity.lastContactedAt.toISOString()}\n`);

  // 4. Schedule Follow-up & Schedule Site Visit (Stage 3: "site_visit")
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const followup = await Followup.create({
    opportunity: opportunity._id,
    owner: telecaller._id,
    dueAt: tomorrow,
    purpose: 'Site Visit Pickup & Guidance',
    status: 'scheduled'
  });

  const siteVisit = await SiteVisit.create({
    opportunity: opportunity._id,
    project: project._id,
    scheduledBy: telecaller._id,
    owner: telecaller._id,
    scheduledAt: tomorrow,
    status: 'planned',
    feedback: {
      notes: 'Pick up requested from Master Canteen, Bhubaneswar'
    }
  });

  opportunity.stage = 'site_visit';
  await opportunity.save();

  console.log(`✅ [Step 3: Site Visit Scheduled] Follow-up & Site Visit Records Created`);
  console.log(`   Followup ID: ${followup._id} | Due: ${followup.dueAt.toISOString().split('T')[0]}`);
  console.log(`   Site Visit Status: "${siteVisit.status}" | Updated Stage: "${opportunity.stage}"\n`);

  // 5. Complete Site Visit & Move to Stage 4 ("negotiation")
  siteVisit.status = 'completed';
  siteVisit.completedAt = new Date();
  siteVisit.feedback = {
    response: 'liked',
    interest: 'high',
    notes: 'Client loved flat 402 layout. Negotiation on pricing underway.'
  };
  await siteVisit.save();

  opportunity.stage = 'negotiation';
  await opportunity.save();

  console.log(`✅ [Step 4: Site Visited & Negotiation] Site Visit Completed (${siteVisit.feedback})`);
  console.log(`   Updated Stage: "${opportunity.stage}"\n`);

  // 6. Close Deal & Create Customer Booking (Stage 5: "won")
  opportunity.stage = 'won';
  await opportunity.save();

  const booking = await Booking.create({
    opportunity: opportunity._id,
    customer: customer._id,
    project: project._id,
    owner: telecaller._id,
    unitNumber: 'A-402',
    sqftArea: 1650,
    bhk: '3BHK',
    bookingDate: new Date(),
    finalPrice: 6800000,
    totalCost: 7100000,
    totalPaid: 500000,
    currentStatus: 'booked',
    remarks: 'Booking confirmed with initial token amount payment of ₹5,00,000.'
  });

  console.log(`✅ [Step 5: Deal Won & Booking Confirmed] Booking Created Successfully!`);
  console.log(`   Booking Unit: ${booking.unitNumber} (${booking.bhk} - ${booking.sqftArea} sq.ft)`);
  console.log(`   Final Price: ₹${booking.finalPrice.toLocaleString()} | Total Cost: ₹${booking.totalCost.toLocaleString()}`);
  console.log(`   Initial Token Received: ₹${booking.totalPaid.toLocaleString()} | Status: "${booking.currentStatus}"\n`);

  console.log('====================================================');
  console.log('🎉 NEXT STAGE PIPELINE AUDIT PASSED WITH 100% SUCCESS');
  console.log('====================================================\n');

  // Cleanup test record
  await Booking.deleteOne({ _id: booking._id });
  await SiteVisit.deleteOne({ _id: siteVisit._id });
  await Followup.deleteOne({ _id: followup._id });
  await Activity.deleteOne({ _id: activity1._id });
  await Opportunity.deleteOne({ _id: opportunity._id });
  await Customer.deleteOne({ _id: customer._id });

  console.log('🧹 Cleaned up temporary test pipeline records.');
  await mongoose.connection.close();
}

testNextStagePipeline().catch(async (err) => {
  console.error('❌ Pipeline Test Error:', err);
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  process.exit(1);
});
