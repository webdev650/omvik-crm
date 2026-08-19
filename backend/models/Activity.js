const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    opportunity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Opportunity',
      required: [true, 'Opportunity reference is required']
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required']
    },
    channel: {
      type: String,
      enum: ['call', 'whatsapp', 'email', 'meeting', 'note'],
      required: [true, 'Activity channel is required']
    },
    outcome: {
      type: String,
      enum: [
        'connected',
        'no_answer',
        'busy',
        'switched_off',
        'wrong_number',
        'interested',
        'not_interested'
      ],
      required: [true, 'Activity outcome is required']
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Activity', activitySchema);
