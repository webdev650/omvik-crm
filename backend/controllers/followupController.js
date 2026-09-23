const Followup = require('../models/Followup');

// @desc    Get logged-in user's followups (Filterable by status, sorted by dueAt ascending)
// @route   GET /api/followups/me
// @access  Private
const getMyFollowups = async (req, res, next) => {
  try {
    const { status } = req.query;

    const filter = { owner: req.user._id };

    if (status) {
      filter.status = status;
    }

    const followups = await Followup.find(filter)
      .sort({ dueAt: 1 })
      .populate({
        path: 'opportunity',
        select: 'stage isActive customer project',
        populate: [
          { path: 'customer', select: 'name primaryMobile email city' },
          { path: 'project', select: 'name code location' }
        ]
      })
      .populate('owner', 'name email role');

    res.json({
      success: true,
      count: followups.length,
      followups
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark a followup as completed
// @route   PATCH /api/followups/:id/complete
// @access  Private
const completeFollowup = async (req, res, next) => {
  try {
    const { id } = req.params;

    const followup = await Followup.findById(id);
    if (!followup) {
      return res.status(404).json({ message: 'Followup not found' });
    }

    // Check ownership / permission (owner, admin, or team lead)
    if (
      followup.owner.toString() !== req.user._id.toString() &&
      !['super_admin', 'director', 'admin'].includes(req.user.role)
    ) {
      return res.status(403).json({ message: 'Not authorized to modify this followup' });
    }

    followup.status = 'completed';
    await followup.save();

    res.json({
      success: true,
      message: 'Followup marked as completed',
      followup
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all followups for a specific opportunity
// @route   GET /api/followups/opportunity/:opportunityId
// @access  Private
const getFollowupsByOpportunity = async (req, res, next) => {
  try {
    const { opportunityId } = req.params;

    const followups = await Followup.find({ opportunity: opportunityId })
      .sort({ dueAt: 1 })
      .populate('owner', 'name email role');

    res.json({
      success: true,
      count: followups.length,
      followups
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get dashboard visibility counts for followups & SLA metrics (Rule 22: Due Today, Due Soon, Overdue, SLA Breached, Rescheduled, Resolved)
// @route   GET /api/followups/summary
// @access  Private
const getFollowupSummary = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const isManager = ['admin', 'super_admin', 'director'].includes(req.user.role);

    const userFilter = isManager ? {} : { owner: userId };

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const in2Days = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const allFollowups = await Followup.find(userFilter);

    let dueToday = 0;
    let dueSoon = 0;
    let overdue = 0;
    let rescheduled = 0;
    let resolved = 0;

    for (const f of allFollowups) {
      if (f.status === 'completed') {
        resolved++;
      } else if (f.status === 'overdue' || (f.status === 'scheduled' && f.dueAt < now)) {
        overdue++;
      } else if (f.status === 'rescheduled') {
        rescheduled++;
      } else if (f.status === 'scheduled') {
        if (f.dueAt >= startOfToday && f.dueAt <= endOfToday) {
          dueToday++;
        } else if (f.dueAt > endOfToday && f.dueAt <= in2Days) {
          dueSoon++;
        }
      }
    }

    const Opportunity = require('../models/Opportunity');
    const oppFilter = isManager ? { isActive: true } : { owner: userId, isActive: true };
    const slaBreachedCount = await Opportunity.countDocuments({ ...oppFilter, slaBreached: true });

    res.json({
      success: true,
      summary: {
        dueToday,
        dueSoon,
        overdue,
        slaBreached: slaBreachedCount,
        rescheduled,
        resolved,
        totalTracked: allFollowups.length
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyFollowups,
  completeFollowup,
  getFollowupsByOpportunity,
  getFollowupSummary
};
