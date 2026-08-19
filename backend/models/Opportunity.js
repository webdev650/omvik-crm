const mongoose = require('mongoose');

const opportunitySchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer reference is required']
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project reference is required']
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    stage: {
      type: String,
      enum: [
        'new',
        'contacted',
        'qualified',
        'site_visit',
        'negotiation',
        'nurture',
        'won',
        'lost'
      ],
      default: 'new'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    source: {
      type: String,
      default: 'direct'
    },
    campaign: {
      type: String,
      default: ''
    },
    slaBreached: {
      type: Boolean,
      default: false
    },
    lastContactedAt: {
      type: Date,
      default: null
    },
    lostReason: {
      type: String,
      trim: true,
      default: ''
    },
    closedAt: {
      type: Date,
      default: null
    },
    supersededBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Opportunity',
      default: null
    }
  },
  {
    timestamps: true
  }
);

// CRITICAL UNIQUE CONSTRAINT FOR RACE-CONDITION SAFE DUPLICATE PREVENTION:
// Enforces that a customer can have only ONE active opportunity for a specific project.
opportunitySchema.index(
  { customer: 1, project: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
);

module.exports = mongoose.model('Opportunity', opportunitySchema);
