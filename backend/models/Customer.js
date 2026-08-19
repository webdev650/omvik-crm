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
    }
  },
  {
    timestamps: true
  }
);

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
