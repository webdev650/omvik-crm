const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Opportunity = require('../models/Opportunity');
const Lead = require('../models/Lead');

function normalizeSource(val) {
  if (!val || typeof val !== 'string') return 'DIRECT';
  let s = val.trim().toUpperCase();
  if (s === 'WEB' || s === 'WEBSITE' || s === 'SITE') return 'WEBSITE';
  if (s === 'FB' || s === 'FACEBOOK' || s === 'FACEBOOK ADS' || s === 'META' || s === 'META ADS') return 'FACEBOOK ADS';
  if (s === 'GOOGLE' || s === 'GOOGLE ADS' || s === 'PPC' || s === 'GADS') return 'GOOGLE ADS';
  if (s === 'WALK IN' || s === 'WALK-IN' || s === 'WALKIN') return 'WALK IN';
  if (s === 'BULK_IMPORT' || s === 'BULK IMPORT' || s === 'SHEET' || s === 'EXCEL') return 'BULK IMPORT';
  if (s === 'REFERRAL' || s === 'REF') return 'REFERRAL';
  return s;
}

async function migrate() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/omvik-crm';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for Source Normalization Migration:', mongoUri);

    const opps = await Opportunity.find({});
    let oppUpdated = 0;
    for (const opp of opps) {
      const norm = normalizeSource(opp.source);
      if (opp.source !== norm) {
        opp.source = norm;
        await opp.save();
        oppUpdated++;
      }
    }

    const leads = await Lead.find({});
    let leadUpdated = 0;
    for (const l of leads) {
      const norm = normalizeSource(l.source);
      if (l.source !== norm) {
        l.source = norm;
        await l.save();
        leadUpdated++;
      }
    }

    console.log(`✅ [Source Migration] Completed! Updated ${oppUpdated} Opportunities and ${leadUpdated} Leads to canonical uppercase sources.`);
    process.exit(0);
  } catch (err) {
    console.error('Source Migration error:', err);
    process.exit(1);
  }
}

migrate();
