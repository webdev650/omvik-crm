const mongoose = require('mongoose');

const duplicateAttemptLogSchema = new mongoose.Schema(
  {
    rawName: {
      type: String,
      trim: true
    },
    rawMobile: {
      type: String,
      trim: true
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project'
    },
    source: {
      type: String,
      default: 'website'
    },
    matchedCustomer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer'
    },
    existingOpportunity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Opportunity'
    },
    blockedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('DuplicateAttemptLog', duplicateAttemptLogSchema);
