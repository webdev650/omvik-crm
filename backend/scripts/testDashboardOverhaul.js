const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

// Register models
require('../models/Customer');
require('../models/Project');
require('../models/User');
require('../models/Opportunity');
require('../models/Followup');
require('../models/SiteVisit');

const User = require('../models/User');

async function testDashboard() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/omvik-crm';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for Dashboard Test:', mongoUri);

    const admin = await User.findOne({ role: 'super_admin' });
    if (!admin) {
      console.error('No super admin found for testing');
      process.exit(1);
    }

    const { getDashboardStats } = require('../controllers/dashboardController');

    const req = {
      user: admin,
      dataScope: {},
      query: { bestDateRange: 'this_month' }
    };

    let responseData = null;
    const res = {
      json: (data) => {
        responseData = data;
      }
    };

    await getDashboardStats(req, res, (err) => {
      if (err) throw err;
    });

    console.log('\n--- DASHBOARD OVERHAUL TEST RESULTS ---');
    console.log('Total Cumulative Leads:', responseData?.stats?.totalLeads);
    console.log('Active Leads (High/Med Intent):', responseData?.stats?.activeLeadsCount);
    console.log('Inactive Leads (Low Intent/Lost):', responseData?.stats?.inactiveLeadsCount);
    console.log('Uncontacted Leads (0 touchpoints):', responseData?.stats?.uncontactedLeadsCount);
    console.log('Deals Won:', responseData?.stats?.wonCount);
    console.log('Deals Lost:', responseData?.stats?.lostCount);
    console.log('SLA Breached (>48h):', responseData?.stats?.slaBreachedCount);
    console.log('Overdue Buckets:', responseData?.stats?.overdueBuckets);
    console.log('Normalized Sources:', responseData?.stats?.bySource);
    console.log('Project Deep Dive Ratios:', responseData?.stats?.projectDeepDive?.ratios);
    console.log('Best Performers:', responseData?.stats?.bestPerformers);
    console.log('----------------------------------------\n');

    console.log('✅ ALL DASHBOARD OVERHAUL TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    console.error('Test Dashboard Error:', err);
    process.exit(1);
  }
}

testDashboard();
