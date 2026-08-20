const Opportunity = require('../models/Opportunity');
const Customer = require('../models/Customer');
const Followup = require('../models/Followup');
const AuditLog = require('../models/AuditLog');
const DuplicateAttemptLog = require('../models/DuplicateAttemptLog');

// @desc    Get Data Quality metrics (Unowned, Invalid Mobile, Missing Next Action, Stale 14+ Days)
// @route   GET /api/admin/data-quality
// @access  Private (Admin only)
const getDataQualityMetrics = async (req, res, next) => {
  try {
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const [
      noOwnerCount,
      invalidMobileCount,
      stale14DaysCount,
      activeOpps,
      pendingFollowups
    ] = await Promise.all([
      Opportunity.countDocuments({ $or: [{ owner: null }, { owner: { $exists: false } }], isActive: true }),
      Customer.countDocuments({ $or: [{ primaryMobile: { $exists: false } }, { primaryMobile: '' }] }),
      Opportunity.countDocuments({ isActive: true, updatedAt: { $lt: fourteenDaysAgo } }),
      Opportunity.find({ isActive: true, stage: { $in: ['new', 'contacted'] } }).select('_id customer project owner stage updatedAt').populate('customer project owner').lean(),
      Followup.find({ status: { $in: ['pending', 'scheduled'] } }).select('opportunity').lean()
    ]);

    // Find active opportunities with NO pending follow-up (violating Next Action Rule)
    const oppIdsWithPendingFollowup = new Set(pendingFollowups.map(f => f.opportunity?.toString()));
    const noNextActionOpps = activeOpps.filter(o => !oppIdsWithPendingFollowup.has(o._id.toString()));

    res.json({
      success: true,
      dataQuality: {
        noOwnerCount,
        invalidMobileCount,
        noNextActionCount: noNextActionOpps.length,
        stale14DaysCount,
        noNextActionList: noNextActionOpps.slice(0, 15)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Duplicate Monitor metrics & attempt logs
// @route   GET /api/admin/duplicate-monitor
// @access  Private (Admin only)
const getDuplicateMonitorMetrics = async (req, res, next) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [
      blockedTodayCount,
      overridesTodayCount,
      recentBlockedAttempts
    ] = await Promise.all([
      DuplicateAttemptLog.countDocuments({ createdAt: { $gte: startOfDay } }),
      AuditLog.countDocuments({ action: 'duplicate_override', createdAt: { $gte: startOfDay } }),
      DuplicateAttemptLog.find()
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('project', 'name code')
        .populate('matchedCustomer', 'name primaryMobile')
        .populate({
          path: 'existingOpportunity',
          populate: { path: 'owner', select: 'name email role' }
        })
        .lean()
    ]);

    res.json({
      success: true,
      duplicateMonitor: {
        blockedTodayCount,
        overridesTodayCount,
        recentBlockedAttempts
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDataQualityMetrics,
  getDuplicateMonitorMetrics
};
