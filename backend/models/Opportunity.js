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
      default: null,
      index: true
    },
    slaBreached: {
      type: Boolean,
      default: false
    },
    escalationLevel: {
      type: String,
      enum: ['none', 'employee', 'manager', 'reassignment_eligible'],
      default: 'none'
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

// Pre-save hook: Normalize source string (trim & uppercase)
opportunitySchema.pre('save', function (next) {
  if (this.source && typeof this.source === 'string') {
    let s = this.source.trim().toUpperCase();
    if (s === 'WEB' || s === 'WEBSITE') s = 'WEBSITE';
    if (s === 'FB' || s === 'FACEBOOK' || s === 'FACEBOOK ADS' || s === 'META' || s === 'META ADS') s = 'FACEBOOK ADS';
    this.source = s;
  }
  if (typeof next === 'function') next();
});

// CRITICAL UNIQUE CONSTRAINT FOR RACE-CONDITION SAFE DUPLICATE PREVENTION:
// Enforces that a customer can have only ONE active opportunity for a specific project.
opportunitySchema.index(
  { customer: 1, project: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
);

module.exports = mongoose.model('Opportunity', opportunitySchema);
