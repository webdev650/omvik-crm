const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      unique: true,
      trim: true
    },
    code: {
      type: String,
      required: [true, 'Project code is required'],
      unique: true,
      uppercase: true,
      trim: true
    },
    projectCode: {
      type: String,
      unique: true,
      uppercase: true,
      trim: true,
      sparse: true
    },
    location: {
      type: String,
      trim: true
    },
    builder: {
      type: String,
      trim: true,
      default: 'Omvik Realcon'
    },
    propertyType: {
      type: String,
      trim: true,
      default: 'Apartment'
    },
    status: {
      type: String,
      enum: ['active', 'upcoming', 'completed', 'sold_out'],
      default: 'active'
    },
    description: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    parentProject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null
    }
  },
  {
    timestamps: true
  }
);

projectSchema.pre('validate', function (next) {
  if (!this.projectCode && this.code) {
    this.projectCode = this.code;
  }
  if (!this.code && this.projectCode) {
    this.code = this.projectCode;
  }
  if (typeof next === 'function') next();
});

module.exports = mongoose.model('Project', projectSchema);

