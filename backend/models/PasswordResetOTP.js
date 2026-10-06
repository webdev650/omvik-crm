const mongoose = require('mongoose');

/**
 * PasswordResetOTP
 * ─────────────────────────────────────────────────────
 * Security design:
 *  • `otpHash`  — bcrypt hash of the 6-digit code; plaintext is NEVER stored.
 *  • `attempts` — incremented on each failed verify; capped at 5 (maxAttempts).
 *  • `used`     — flipped to true on first successful verify (single-use).
 *  • `expiresAt`— TTL index auto-removes documents after expiry.
 *
 * Verification flow:
 *   1. Find all recent unused/unexpired OTPs for the user (by userId).
 *   2. bcrypt.compare(submittedCode, record.otpHash) for each.
 *   3. Increment attempts on any non-matching record searched.
 */
const passwordResetOTPSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    otpHash: {
      type: String,
      required: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 } // TTL index auto-removes expired documents
    },
    used: {
      type: Boolean,
      default: false
    },
    attempts: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Fast lookup: active OTPs per user
passwordResetOTPSchema.index({ user: 1, used: 1, expiresAt: 1 });

module.exports = mongoose.model('PasswordResetOTP', passwordResetOTPSchema);
