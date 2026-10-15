const mongoose = require('mongoose');
const normalizePhone = require('../utils/normalizePhone');

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true
    },
    primaryMobile: {
      type: String,
      required: [true, 'Primary mobile number is required'],
      index: true
    },
    alternateMobile: {
      type: String,
      default: ''
    },
    whatsapp: {
      type: String,
      default: ''
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: ''
    },
    city: {
      type: String,
      trim: true,
      default: ''
    },
    address: {
      type: String,
      trim: true,
      default: ''
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Indexes for high-speed pagination, searching and scoping
customerSchema.index({ owner: 1, createdAt: -1 });
customerSchema.index({ phone: 1 });
customerSchema.index({ name: 1 });
customerSchema.index({ createdAt: -1 });
customerSchema.index({ updatedAt: -1 });

// Pre-save hook to normalize phone numbers before saving
customerSchema.pre('save', function () {
  if (this.primaryMobile) {
    this.primaryMobile = normalizePhone(this.primaryMobile);
  }
  if (this.alternateMobile) {
    this.alternateMobile = normalizePhone(this.alternateMobile);
  }
  if (this.whatsapp) {
    this.whatsapp = normalizePhone(this.whatsapp);
  }
});

module.exports = mongoose.model('Customer', customerSchema);
