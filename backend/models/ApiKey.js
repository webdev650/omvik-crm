const mongoose = require('mongoose');

const apiKeySchema = new mongoose.Schema(
  {
    keyHash: {
      type: String,
      required: true,
      unique: true,
      select: false
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('ApiKey', apiKeySchema);
