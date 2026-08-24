const mongoose = require('mongoose');

const loginLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required for login log']
    },
    loginAt: {
      type: Date,
      default: Date.now
    },
    ipAddress: {
      type: String,
      default: 'Unknown'
    },
    userAgent: {
      type: String,
      default: 'Unknown'
    }
  },
  {
    timestamps: true
  }
);

// Index for fast querying by user and date range
loginLogSchema.index({ user: 1, loginAt: -1 });
loginLogSchema.index({ loginAt: -1 });

module.exports = mongoose.model('LoginLog', loginLogSchema);
