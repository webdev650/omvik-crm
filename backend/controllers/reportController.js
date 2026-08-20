const Opportunity = require('../models/Opportunity');
const Followup = require('../models/Followup');
const AuditLog = require('../models/AuditLog');

// @desc    Get self performance metrics for logged-in user (accessible to all roles)
// @route   GET /api/reports/me
// @access  Private (all logged-in users)
const getMyPerformance = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const [
      leadsOwned,
      activitiesLogged,
      followupsCompleted,
      followupsOverdue,
      siteVisitsCompleted,
      opportunitiesWon
    ] = await Promise.all([
      Opportunity.countDocuments({ owner: userId }),
      AuditLog.countDocuments({ user: userId }),
      Followup.countDocuments({ owner: userId, status: 'completed' }),
      Followup.countDocuments({ owner: userId, status: { $in: ['overdue', 'missed'] } }),
      Opportunity.countDocuments({ owner: userId, stage: { $in: ['site_visit', 'negotiation', 'won'] } }),
      Opportunity.countDocuments({ owner: userId, stage: 'won' })
    ]);

    const winRate = leadsOwned > 0 ? Math.round((opportunitiesWon / leadsOwned) * 100) : 0;

    res.json({
      success: true,
      performance: {
        userId,
        userName: req.user.name,
        userRole: req.user.role,
        employeeId: req.user.employeeId,
        leadsOwned,
        activitiesLogged,
        followupsCompleted,
        followupsOverdue,
        siteVisitsCompleted,
        opportunitiesWon,
        winRate
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyPerformance
};
