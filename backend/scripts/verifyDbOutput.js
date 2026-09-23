require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Project = require('../models/Project');
const Customer = require('../models/Customer');
const Opportunity = require('../models/Opportunity');
const Lead = require('../models/Lead');

async function checkOutput() {
  console.log('----------------------------------------------------');
  console.log('🔍 VERIFYING MONGODB IMPORT OUTPUT');
  console.log('----------------------------------------------------\n');

  await connectDB();

  const customersCount = await Customer.countDocuments();
  const oppsCount = await Opportunity.countDocuments();
  const leadsCount = await Lead.countDocuments();

  console.log('====================================================');
  console.log('📊 DATABASE TOTALS');
  console.log('====================================================');
  console.log(` Total Customers    : ${customersCount}`);
  console.log(` Total Opportunities: ${oppsCount}`);
  console.log(` Total Lead Records : ${leadsCount}`);
  console.log('====================================================\n');

  const recentOpps = await Opportunity.find()
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('customer', 'name primaryMobile')
    .populate('owner', 'name role')
    .populate('project', 'name code');

  console.log('📋 Recent 10 Opportunities in MongoDB:');
  recentOpps.forEach((o, i) => {
    const custName = o.customer ? o.customer.name : 'Unknown';
    const mobile = o.customer ? o.customer.primaryMobile : 'N/A';
    const projName = o.project ? o.project.name : 'Unspecified';
    const ownerName = o.owner ? o.owner.name : 'Unassigned';

    console.log(`  ${i + 1}. [${o.leadCode}] ${custName} (${mobile})`);
    console.log(`     Project: ${projName} | Assigned To: ${ownerName} | Stage: ${o.stage}`);
  });

  const recentLeads = await Lead.find()
    .sort({ createdAt: -1 })
    .limit(5);

  console.log('\n📜 Recent 5 Lead Import Execution Logs in MongoDB:');
  recentLeads.forEach((l, i) => {
    console.log(`  ${i + 1}. ${l.rawName} (${l.rawMobile}) -> Batch: ${l.importBatchId} | Status: ${l.duplicateStatus}`);
  });

  console.log('\n✅ Database output check complete.');
  await mongoose.connection.close();
}

checkOutput().catch(async (err) => {
  console.error('Error verifying output:', err);
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});
