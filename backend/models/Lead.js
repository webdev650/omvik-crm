const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema(
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
      default: 'DIRECT'
    },
    campaign: {
      type: String,
      default: ''
    },
    importBatchId: {
      type: String,
      default: null,
      index: true
    },
    intent: {
      type: String,
      enum: ['high', 'medium', 'low', null],
      default: null
    },
    duplicateStatus: {
      type: String,
      enum: ['no_match', 'exact_match', 'blocked', 'override_approved'],
      default: 'no_match'
    },
    matchedCustomer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer'
    },
    resultingOpportunity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Opportunity'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Lead', leadSchema);
