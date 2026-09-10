const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required']
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true
    },
    link: {
      type: String,
      default: ''
    },
    type: {
      type: String,
      enum: ['sla_breach', 'assignment', 'activity', 'general', 'visit_reminder'],
      default: 'general'
    },
    isRead: {
      type: Boolean,
      default: false
    },
    // HIGH priority triggers AlarmModal interruption on the frontend
    priority: {
      type: String,
      enum: ['normal', 'high'],
      default: 'normal'
    },
    // Set when user taps "Dismiss" on the AlarmModal — prevents re-showing
    acknowledgedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Index for efficient polling: high-priority unacknowledged notifications
notificationSchema.index({ user: 1, priority: 1, acknowledgedAt: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
