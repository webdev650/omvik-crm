const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Opportunity = require('../models/Opportunity');

async function runRepair() {
  try {
    const mongoUri = process.env.MONGO_URI;
    console.log('Connecting to MongoDB:', mongoUri.replace(/:([^@]+)@/, ':****@'));
    await mongoose.connect(mongoUri);

    console.log('\n================ ONE-TIME DATA REPAIR SCRIPT ================');

    // 1. Find all Opportunity documents with isActive=false AND stage not in ('won', 'lost')
    const invalidOpps = await Opportunity.find({
      isActive: false,
      stage: { $nin: ['won', 'lost'] }
    });

    console.log(`Found ${invalidOpps.length} invalid opportunity documents where isActive=false but stage is NOT won/lost.`);

    for (const opp of invalidOpps) {
      console.log(`Fixing Opportunity ID: ${opp._id} | Stage: '${opp.stage}' | Previous isActive: ${opp.isActive}`);
      opp.isActive = true;
      opp.closedAt = null;
      await opp.save();
      console.log(`  -> Successfully updated Opportunity ${opp._id} to isActive=true.`);
    }

    // 2. Also check for any string createdAt values in raw db and normalize them to BSON Date
    const rawCollection = mongoose.connection.db.collection('opportunities');
    const rawDocs = await rawCollection.find({}).toArray();
    let stringCreatedAtCount = 0;

    for (const doc of rawDocs) {
      if (typeof doc.createdAt === 'string') {
        stringCreatedAtCount++;
        const dateVal = new Date(doc.createdAt);
        await rawCollection.updateOne(
          { _id: doc._id },
          { $set: { createdAt: dateVal } }
        );
        console.log(`Normalized createdAt string to BSON Date for document ${doc._id}: ${dateVal.toISOString()}`);
      }
    }

    console.log(`\nData Repair Summary:`);
    console.log(`- Opportunities reset to isActive=true: ${invalidOpps.length}`);
    console.log(`- Opportunities createdAt normalized to Date: ${stringCreatedAtCount}`);
    console.log('================ REPAIR COMPLETE ================');

  } catch (error) {
    console.error('Data repair failed:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runRepair();
