const mongoose = require('mongoose');

const passwordResetOTPSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    otpCode: {
      type: String,
      required: true,
      trim: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 } // TTL index automatically cleans up expired documents
    },
    used: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Index for fast query lookup of unused active OTPs
passwordResetOTPSchema.index({ user: 1, otpCode: 1, used: 1 });

module.exports = mongoose.model('PasswordResetOTP', passwordResetOTPSchema);
