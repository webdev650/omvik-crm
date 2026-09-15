const mongoose = require('mongoose');

const dailyReportSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required for daily report']
    },
    date: {
      type: String, // ISO date string YYYY-MM-DD
      required: [true, 'Report date is required']
    },
    claimedCalls: {
      type: Number,
      default: 0,
      min: [0, 'Claimed calls cannot be negative']
    },
    whatsappMessages: {
      type: Number,
      default: 0,
      min: [0, 'WhatsApp messages cannot be negative']
    },
    connectedCalls: {
      type: Number,
      default: 0,
      min: [0, 'Connected calls cannot be negative']
    },
    claimedFollowups: {
      type: Number,
      default: 0,
      min: [0, 'Claimed follow-ups cannot be negative']
    },
    claimedSiteVisits: {
      type: Number,
      default: 0,
      min: [0, 'Claimed site visits cannot be negative']
    },
    bookingsToday: {
      type: Number,
      default: 0,
      min: [0, 'Bookings today cannot be negative']
    },
    leadsAssigned: {
      type: Number,
      default: 0,
      min: [0, 'Leads assigned cannot be negative']
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    systemActivityCount: {
      type: Number,
      default: 0
    },
    systemWhatsappCount: {
      type: Number,
      default: 0
    },
    systemConnectedCallsCount: {
      type: Number,
      default: 0
    },
    systemFollowupCount: {
      type: Number,
      default: 0
    },
    systemSiteVisitCount: {
      type: Number,
      default: 0
    },
    systemBookingsCount: {
      type: Number,
      default: 0
    },
    discrepancyFlag: {
      type: Boolean,
      default: false
    },
    discrepancyNote: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index: One daily report per user per calendar day
dailyReportSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyReport', dailyReportSchema);
