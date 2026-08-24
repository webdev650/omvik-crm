const Opportunity = require('../models/Opportunity');
const Customer = require('../models/Customer');
const Followup = require('../models/Followup');
const AuditLog = require('../models/AuditLog');
const DuplicateAttemptLog = require('../models/DuplicateAttemptLog');
const LoginLog = require('../models/LoginLog');
const User = require('../models/User');

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

// @desc    Get user login activity audit log
// @route   GET /api/admin/login-activity
// @access  Private (admin, super_admin, director, team_lead)
const getLoginActivity = async (req, res, next) => {
  try {
    const { userId, from, to } = req.query;

    const query = {};

    // Team lead scoping: restrict to own team members
    if (req.user.role === 'team_lead') {
      const teamMembers = await User.find({
        $or: [{ teamId: req.user.teamId }, { _id: req.user._id }]
      }).select('_id');
      const teamMemberIds = teamMembers.map(m => m._id);
      query.user = { $in: teamMemberIds };
    }

    // Specific user filter
    if (userId) {
      if (query.user) {
        // Ensure requested userId is within team_lead scope
        if (query.user.$in.some(id => id.toString() === userId.toString())) {
          query.user = userId;
        }
      } else {
        query.user = userId;
      }
    }

    // Date range filter
    if (from || to) {
      query.loginAt = {};
      if (from) {
        query.loginAt.$gte = new Date(from);
      }
      if (to) {
        const toDate = new Date(to);
        if (to.length <= 10) {
          toDate.setHours(23, 59, 59, 999);
        }
        query.loginAt.$lte = toDate;
      }
    }

    const logs = await LoginLog.find(query)
      .sort({ loginAt: -1 })
      .limit(300)
      .populate('user', 'name email employeeId role teamId')
      .lean();

    res.json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDataQualityMetrics,
  getDuplicateMonitorMetrics,
  getLoginActivity
};

