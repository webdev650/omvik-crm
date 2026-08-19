const mongoose = require('mongoose');

const siteVisitSchema = new mongoose.Schema(
  {
    opportunity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Opportunity',
      required: [true, 'Opportunity reference is required']
    },
    scheduledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User (scheduledBy) reference is required']
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    scheduledAt: {
      type: Date,
      required: [true, 'Site visit scheduled date/time is required']
    },
    status: {
      type: String,
      enum: ['planned', 'confirmed', 'completed', 'no_show', 'cancelled'],
      default: 'planned'
    },
    feedback: {
      response: {
        type: String,
        enum: ['liked', 'neutral', 'disliked']
      },
      interest: {
        type: String,
        enum: ['high', 'medium', 'low']
      },
      objection: {
        type: String,
        enum: [
          'price',
          'location',
          'size',
          'amenities',
          'documentation',
          'finance',
          'possession',
          'family',
          'competitor',
          'other'
        ]
      },
      notes: {
        type: String,
        trim: true,
        default: ''
      }
    },
    nextAction: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('SiteVisit', siteVisitSchema);
