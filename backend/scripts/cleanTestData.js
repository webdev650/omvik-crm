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
const Project = require('../models/Project');

async function cleanTestData() {
  console.log('----------------------------------------------------');
  console.log('🧹 OMVIK CRM — CLEANING ALL FAKE TESTING DATA');
  console.log('----------------------------------------------------\n');

  await connectDB();

  // Deletions
  const deletedCustomers = await Customer.deleteMany({});
  const deletedOpportunities = await Opportunity.deleteMany({});
  const deletedLeads = await Lead.deleteMany({});
  const deletedActivities = await Activity.deleteMany({});
  const deletedFollowups = await Followup.deleteMany({});
  const deletedSiteVisits = await SiteVisit.deleteMany({});
  const deletedBookings = await Booking.deleteMany({});
  const deletedNotifications = await Notification.deleteMany({});
  const deletedAuditLogs = await AuditLog.deleteMany({});
  const deletedDuplicateLogs = await DuplicateAttemptLog.deleteMany({});

  // Verify Preserved Records
  const remainingUsers = await User.countDocuments();
  const remainingProjects = await Project.countDocuments();

  console.log('====================================================');
  console.log('🗑️ DELETION CLEANUP SUMMARY');
  console.log('====================================================');
  console.log(` Customers Deleted        : ${deletedCustomers.deletedCount}`);
  console.log(` Opportunities Deleted    : ${deletedOpportunities.deletedCount}`);
  console.log(` Lead Log Entries Deleted : ${deletedLeads.deletedCount}`);
  console.log(` Activities Deleted       : ${deletedActivities.deletedCount}`);
  console.log(` Follow-ups Deleted       : ${deletedFollowups.deletedCount}`);
  console.log(` Site Visits Deleted      : ${deletedSiteVisits.deletedCount}`);
  console.log(` Bookings Deleted         : ${deletedBookings.deletedCount}`);
  console.log(` Notifications Deleted    : ${deletedNotifications.deletedCount}`);
  console.log(` Audit Logs Cleared       : ${deletedAuditLogs.deletedCount}`);
  console.log(` Duplicate Logs Cleared   : ${deletedDuplicateLogs.deletedCount}`);
  console.log('====================================================');
  console.log('🛡️ PRESERVED OFFICIAL DATA');
  console.log('====================================================');
  console.log(` Official User Accounts   : ${remainingUsers} (Preserved 100%)`);
  console.log(` Real Estate Projects     : ${remainingProjects} (Preserved 100%)`);
  console.log('====================================================\n');

  console.log('✨ All fake test data cleared successfully. Database is clean and ready for real production leads.');
  await mongoose.connection.close();
}

cleanTestData().catch(async (err) => {
  console.error('❌ Data Cleanup Error:', err);
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  process.exit(1);
});
