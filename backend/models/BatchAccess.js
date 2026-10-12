const mongoose = require('mongoose');

const batchAccessSchema = new mongoose.Schema(
  {
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ImportBatch',
      default: null,
      index: true
    },
    batchId: {
      type: String,
      required: true,
      index: true
    },
    assignedTo: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
      }
    ],
    accessLevel: {
      type: String,
      enum: ['view', 'edit', 'manage'],
      default: 'view'
    },
    grantedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    grantedAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('BatchAccess', batchAccessSchema);
