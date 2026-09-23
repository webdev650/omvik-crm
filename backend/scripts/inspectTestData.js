require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const Customer = require('../models/Customer');
const Opportunity = require('../models/Opportunity');
const Lead = require('../models/Lead');
const Activity = require('../models/Activity');
const Followup = require('../models/Followup');
const SiteVisit = require('../models/SiteVisit');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const DuplicateAttemptLog = require('../models/DuplicateAttemptLog');
const User = require('../models/User');

async function inspectData() {
  console.log('----------------------------------------------------');
  console.log('🔍 INSPECTING DATABASE DATA FOR CLEANUP');
  console.log('----------------------------------------------------\n');

  await connectDB();

  const counts = {
    customers: await Customer.countDocuments(),
    opportunities: await Opportunity.countDocuments(),
    leads: await Lead.countDocuments(),
    activities: await Activity.countDocuments(),
    followups: await Followup.countDocuments(),
    siteVisits: await SiteVisit.countDocuments(),
    bookings: await Booking.countDocuments(),
    notifications: await Notification.countDocuments(),
    auditLogs: await AuditLog.countDocuments(),
    duplicateAttemptLogs: await DuplicateAttemptLog.countDocuments(),
    users: await User.countDocuments()
  };

  console.log('====================================================');
  console.log('📊 CURRENT COLLECTION COUNTS');
  console.log('====================================================');
  console.log(` Customers            : ${counts.customers}`);
  console.log(` Opportunities        : ${counts.opportunities}`);
  console.log(` Lead Records         : ${counts.leads}`);
  console.log(` Activities           : ${counts.activities}`);
  console.log(` Follow-ups           : ${counts.followups}`);
  console.log(` Site Visits          : ${counts.siteVisits}`);
  console.log(` Bookings             : ${counts.bookings}`);
  console.log(` Notifications        : ${counts.notifications}`);
  console.log(` Audit Logs           : ${counts.auditLogs}`);
  console.log(` Duplicate Attempt Logs: ${counts.duplicateAttemptLogs}`);
  console.log(` Users (Preserved)    : ${counts.users}`);
  console.log('====================================================\n');

  const customersList = await Customer.find().select('name primaryMobile createdAt');
  console.log('📋 Customer Names currently in DB:');
  customersList.forEach((c, i) => {
    console.log(` ${i + 1}. ${c.name} (${c.primaryMobile || 'No Phone'})`);
  });

  await mongoose.connection.close();
}

inspectData().catch(async (err) => {
  console.error('Error inspecting data:', err);
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});
