const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    opportunity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Opportunity',
      required: [true, 'Opportunity reference is required']
    },
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
    contact: {
      type: String,
      trim: true,
      default: ''
    },
    location: {
      type: String,
      trim: true,
      default: ''
    },
    projectType: {
      type: String,
      trim: true,
      default: 'Apartment'
    },
    unitNumber: {
      type: String,
      trim: true,
      default: ''
    },
    sqftArea: {
      type: Number,
      default: 0
    },
    bhk: {
      type: String,
      trim: true,
      default: null
    },
    bookingDate: {
      type: Date,
      required: [true, 'Booking date is required'],
      default: Date.now
    },
    finalPrice: {
      type: Number,
      required: [true, 'Final price is required']
    },
    totalCost: {
      type: Number,
      required: [true, 'Total cost is required']
    },
    totalPaid: {
      type: Number,
      default: 0
    },
    probableRegistrationDate: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: [
        'booked',
        'registration',
        'construction_under_progress',
        'construction_in_progress',
        'completed',
        'unit_handover_etc',
        'unit_handover',
        'deal_closed'
      ],
      default: 'booked'
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    remarks: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual field: paymentRemaining = totalCost - totalPaid
bookingSchema.virtual('paymentRemaining').get(function () {
  const cost = this.totalCost || 0;
  const paid = this.totalPaid || 0;
  return Math.max(0, cost - paid);
});

// Virtual field: paymentPercentage = totalCost > 0 ? (totalPaid / totalCost * 100) : 0
bookingSchema.virtual('paymentPercentage').get(function () {
  const cost = this.totalCost || 0;
  const paid = this.totalPaid || 0;
  if (cost <= 0) return 0;
  const pct = (paid / cost) * 100;
  return Number(pct.toFixed(1));
});

module.exports = mongoose.model('Booking', bookingSchema);
