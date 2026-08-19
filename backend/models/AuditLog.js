const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required for audit log']
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      trim: true
    },
    entity: {
      type: String,
      required: [true, 'Entity type is required'],
      trim: true
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    reason: {
      type: String,
      required: [true, 'Reason is required for audit trail'],
      trim: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

// Audit logs are append-only audit records
module.exports = mongoose.model('AuditLog', auditLogSchema);
