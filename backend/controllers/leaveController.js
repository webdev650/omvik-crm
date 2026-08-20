const Leave = require('../models/Leave');
const User = require('../models/User');

/**
 * @desc    Submit a leave request or log pre-approved leave for an employee
 * @route   POST /api/leave
 * @access  Private (All users for self-request, Admin for logging on behalf of others)
 */
const requestLeave = async (req, res, next) => {
  try {
    const { startDate, endDate, reason, userId, status } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required.' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      return res.status(400).json({ message: 'End date cannot be earlier than start date.' });
    }

    let targetUserId = req.user._id;
    let leaveStatus = 'pending';
    let approvedBy = null;

    const isAdmin = ['admin', 'super_admin', 'director'].includes(req.user.role);

    // Admin logging on behalf of employee pre-approved
    if (isAdmin && userId) {
      targetUserId = userId;
      leaveStatus = status && ['approved', 'pending'].includes(status) ? status : 'approved';
      if (leaveStatus === 'approved') {
        approvedBy = req.user._id;
      }
    }

    const leave = await Leave.create({
      user: targetUserId,
      startDate: start,
      endDate: end,
      reason: reason ? reason.trim() : '',
      status: leaveStatus,
      approvedBy
    });

    const populatedLeave = await Leave.findById(leave._id)
      .populate('user', 'name email employeeId role')
      .populate('approvedBy', 'name email');

    res.status(201).json({
      success: true,
      message: leaveStatus === 'approved' ? 'Pre-approved leave recorded successfully.' : 'Leave request submitted for approval.',
      leave: populatedLeave
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get leave records (all leaves for admin, self leaves for staff)
 * @route   GET /api/leave
 * @access  Private (All authenticated users)
 */
const getLeaves = async (req, res, next) => {
  try {
    const isAdmin = ['admin', 'super_admin', 'director'].includes(req.user.role);
    const filter = isAdmin ? {} : { user: req.user._id };

    const leaves = await Leave.find(filter)
      .populate('user', 'name email employeeId role')
      .populate('approvedBy', 'name email')
      .sort({ startDate: -1 });

    res.json({
      success: true,
      count: leaves.length,
      leaves
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve or reject a pending leave request
 * @route   PATCH /api/leave/:id/decide
 * @access  Private (Admin, Super Admin, Director)
 */
const decideLeave = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be "approved" or "rejected".' });
    }

    const leave = await Leave.findById(req.params.id);
    if (!leave) {
      return res.status(404).json({ message: 'Leave record not found.' });
    }

    leave.status = status;
    leave.approvedBy = req.user._id;
    await leave.save();

    const updatedLeave = await Leave.findById(leave._id)
      .populate('user', 'name email employeeId role')
      .populate('approvedBy', 'name email');

    res.json({
      success: true,
      message: `Leave request marked as ${status}.`,
      leave: updatedLeave
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get list of user IDs currently on approved leave today
 * @route   GET /api/leave/active-now
 * @access  Private (All authenticated users)
 */
const getActiveLeaves = async (req, res, next) => {
  try {
    const now = new Date();

    const activeLeaves = await Leave.find({
      status: 'approved',
      startDate: { $lte: now },
      endDate: { $gte: now }
    }).select('user startDate endDate reason');

    const activeUserIds = activeLeaves.map((l) => l.user.toString());

    res.json({
      success: true,
      activeUserIds,
      activeLeaves
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requestLeave,
  getLeaves,
  decideLeave,
  getActiveLeaves
};
