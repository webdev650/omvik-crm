const mongoose = require('mongoose');

const followupSchema = new mongoose.Schema(
  {
    opportunity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Opportunity',
      required: [true, 'Opportunity reference is required']
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner reference is required']
    },
    dueAt: {
      type: Date,
      required: [true, 'Followup due date (dueAt) is required']
    },
    purpose: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'missed', 'overdue', 'cancelled'],
      default: 'scheduled'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Followup', followupSchema);
