const mongoose = require('mongoose');

/**
 * VisitReminder — tracks the 3 alarm-style reminders auto-generated
 * when a SiteVisit is scheduled.
 *
 * types:
 *   'day_before'     — fires scheduledAt minus 24 hours
 *   'morning_of'     — fires 8:00 AM on the day of the visit
 *   'final_reminder' — fires scheduledAt minus 1 hour
 *
 * Snooze creates a NEW VisitReminder record (same siteVisit, new scheduledFor = now + 10min)
 * rather than mutating the existing one, to preserve the full reminder audit trail.
 */
const visitReminderSchema = new mongoose.Schema(
  {
    siteVisit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SiteVisit',
      required: [true, 'SiteVisit reference is required']
    },
    type: {
      type: String,
      enum: ['day_before', 'morning_of', 'final_reminder'],
      required: [true, 'Reminder type is required']
    },
    scheduledFor: {
      type: Date,
      required: [true, 'scheduledFor date is required — the exact moment this reminder should fire']
    },
    fired: {
      type: Boolean,
      default: false
    },
    acknowledgedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Index for efficient sweep queries (fired=false + scheduledFor past)
visitReminderSchema.index({ scheduledFor: 1, fired: 1 });

module.exports = mongoose.model('VisitReminder', visitReminderSchema);
