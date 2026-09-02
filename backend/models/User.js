const mongoose = require('mongoose');
const Counter = require('./Counter');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false
    },
    employeeId: {
      type: String,
      unique: true,
      sparse: true
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    role: {
      type: String,
      enum: [
        'super_admin',
        'director',
        'admin',
        'team_lead',
        'telecaller',
        'marketing',
        'finance'
      ],
      default: 'telecaller'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    mustChangePassword: {
      type: Boolean,
      default: false
    },
    nudgesEnabled: {
      type: Boolean,
      default: true
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      default: null
    },
    projectIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
      }
    ]
  },
  {
    timestamps: true
  }
);

// Pre-save hook to auto-generate sequential ADM-xxx / EMP-xxx employeeId for new users
userSchema.pre('save', async function () {
  if (this.isNew && !this.employeeId) {
    const adminRoles = ['super_admin', 'director', 'admin', 'team_lead'];
    const prefix = adminRoles.includes(this.role) ? 'ADM' : 'EMP';
    const counterName = `user_id_${prefix.toLowerCase()}`;

    const counter = await Counter.findOneAndUpdate(
      { name: counterName },
      { $inc: { value: 1 } },
      { returnDocument: 'after', upsert: true }
    );

    const seqNumber = String(counter.value).padStart(3, '0');
    this.employeeId = `${prefix}-${seqNumber}`;
  }
});

module.exports = mongoose.model('User', userSchema);
