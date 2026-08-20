require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Customer = require('../models/Customer');
const Project = require('../models/Project');
const Opportunity = require('../models/Opportunity');

async function seedMultiOpportunityCustomer() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('=== SEEDING PERSISTENT MULTI-OPPORTUNITY TEST CUSTOMER ===\n');

  // Find or create Projects
  let projA = await Project.findOne({ name: /Emerald/i });
  if (!projA) {
    projA = await Project.create({ name: 'Emerald Heights', code: 'EMH_001', location: 'Bhubaneswar' });
  }

  let projB = await Project.findOne({ name: /Royal/i });
  if (!projB) {
    projB = await Project.create({ name: 'Royal Palms Villa', code: 'RPV_002', location: 'Cuttack' });
  }

  // Find Admin & Telecaller
  const adminUser = await User.findOne({ email: 'admin@omvik.com' });
  const repUser = await User.findOne({ email: 'iso_a_1787203259253@omvik.com' }) || adminUser;

  // Find or create Customer Rahul Sharma
  let customer = await Customer.findOne({ primaryMobile: '9937000360' });
  if (!customer) {
    customer = await Customer.create({
      name: 'Rahul Sharma (Customer 360 Demo)',
      primaryMobile: '9937000360',
      email: 'rahul.demo@omvik.com',
      city: 'Bhubaneswar'
    });
  }

  // Find or create Opp 1 (Project A + Admin)
  let opp1 = await Opportunity.findOne({ customer: customer._id, project: projA._id });
  if (!opp1) {
    opp1 = await Opportunity.create({
      customer: customer._id,
      project: projA._id,
      owner: adminUser._id,
      rawName: 'Rahul - Emerald Heights 3BHK',
      stage: 'negotiation'
    });
  }

  // Find or create Opp 2 (Project B + Telecaller)
  let opp2 = await Opportunity.findOne({ customer: customer._id, project: projB._id });
  if (!opp2) {
    opp2 = await Opportunity.create({
      customer: customer._id,
      project: projB._id,
      owner: repUser._id,
      rawName: 'Rahul - Royal Palms Villa',
      stage: 'site_visit'
    });
  }

  console.log('✅ MULTI-OPPORTUNITY TEST CUSTOMER SEEDED:');
  console.log(`   Customer Name: ${customer.name}`);
  console.log(`   Customer ID: ${customer._id}`);
  console.log(`   Customer 360 URL: https://omvik-crm.vercel.app/customers/${customer._id}`);
  console.log(`   Opportunity 1: Project ${projA.name} | Owner: ${adminUser?.name || 'Admin'} | Stage: ${opp1.stage}`);
  console.log(`   Opportunity 2: Project ${projB.name} | Owner: ${repUser?.name || 'Telecaller'} | Stage: ${opp2.stage}\n`);

  await mongoose.disconnect();
}

seedMultiOpportunityCustomer().catch(console.error);
