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
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    systemActivityCount: {
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
