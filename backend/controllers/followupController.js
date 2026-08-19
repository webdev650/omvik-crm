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

module.exports = {
  getMyFollowups,
  completeFollowup
};
