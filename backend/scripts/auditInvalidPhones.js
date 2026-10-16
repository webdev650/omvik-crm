/**
 * READ-ONLY AUDIT SCRIPT: Audit existing leads in OMVIK CRM database
 * against strict Indian phone validation rules.
 *
 * NOTE: This script is 100% READ-ONLY. It does NOT modify or delete any records.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const Opportunity = require('../models/Opportunity');
const Customer = require('../models/Customer');
const Project = require('../models/Project');
const { isValidIndianMobile } = require('../utils/phoneValidator');

async function runAudit() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/omvik_crm';
  console.log('Connecting to MongoDB (read-only audit)...');
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB.\n');

  console.log('Scanning all Opportunity records in database...');
  const opportunities = await Opportunity.find({})
    .populate('customer', 'name primaryMobile alternateMobile')
    .populate('project', 'name')
    .select('leadCode phone customer project stage createdAt owner')
    .lean();

  console.log(`Total Opportunities scanned: ${opportunities.length}`);

  let validCount = 0;
  let invalidCount = 0;
  const invalidByReason = {}; // reason -> Array of lead info

  for (const opp of opportunities) {
    const rawPhone = opp.phone || opp.customer?.primaryMobile || '';
    const validation = isValidIndianMobile(rawPhone);

    if (validation.isValid) {
      validCount++;
    } else {
      invalidCount++;
      const reason = validation.reason || 'Unknown reason';
      if (!invalidByReason[reason]) {
        invalidByReason[reason] = [];
      }
      invalidByReason[reason].push({
        leadCode: opp.leadCode || 'NO_CODE',
        customerName: opp.customer?.name || 'Prospect',
        phone: rawPhone || '(empty)',
        project: opp.project?.name || 'N/A',
        stage: opp.stage || 'new',
        createdAt: opp.createdAt ? new Date(opp.createdAt).toISOString().split('T')[0] : 'N/A'
      });
    }
  }

  console.log('\n===============================================================');
  console.log('               OMVIK CRM - PHONE NUMBER AUDIT REPORT           ');
  console.log('===============================================================');
  console.log(`Total Records Audited : ${opportunities.length}`);
  console.log(`Valid Phone Numbers   : ${validCount} (${((validCount / Math.max(1, opportunities.length)) * 100).toFixed(1)}%)`);
  console.log(`Invalid Phone Numbers : ${invalidCount} (${((invalidCount / Math.max(1, opportunities.length)) * 100).toFixed(1)}%)`);
  console.log('===============================================================\n');

  if (invalidCount === 0) {
    console.log('All existing leads pass the phone number verification rules! No invalid numbers found.');
  } else {
    console.log('BREAKDOWN OF INVALID LEADS BY REASON:\n');
    for (const [reason, leads] of Object.entries(invalidByReason)) {
      console.log(`---------------------------------------------------------------`);
      console.log(`REASON: "${reason}" (Count: ${leads.length})`);
      console.log(`---------------------------------------------------------------`);
      for (const lead of leads) {
        console.log(`  • Lead Code: ${lead.leadCode.padEnd(25)} | Phone: ${lead.phone.padEnd(16)} | Customer: ${lead.customerName.padEnd(20)} | Project: ${lead.project} (${lead.stage})`);
      }
      console.log('');
    }
  }

  console.log('===============================================================');
  console.log('End of Audit Report. (No records modified or deleted)');
  console.log('===============================================================\n');

  await mongoose.disconnect();
}

runAudit().catch((err) => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
