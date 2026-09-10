const Notification = require('../models/Notification');

// @desc    Get current user's notifications (newest first)
//          Supports query filters: ?priority=high, ?acknowledged=false
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res, next) => {
  try {
    const filter = { user: req.user._id };

    // Optional filter: only high-priority
    if (req.query.priority === 'high') {
      filter.priority = 'high';
    }

    // Optional filter: only unacknowledged (acknowledgedAt is null)
    if (req.query.acknowledged === 'false') {
      filter.acknowledgedAt = null;
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 });

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    res.json({
      success: true,
      count: notifications.length,
      unreadCount,
      notifications
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get lightweight unread notifications count badge for logged in user
// @route   GET /api/notifications/unread-count
// @access  Private
const getUnreadCount = async (req, res, next) => {
  try {
    const unreadCount = await Notification.countDocuments({
      user: req.user._id,
      isRead: false
    });

    res.json({
      success: true,
      unreadCount
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark a notification as read (Scoped strictly to user)
// @route   PATCH /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.isRead = true;
    await notification.save();

    res.json({
      success: true,
      message: 'Notification marked as read',
      notification
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all unread notifications as read for logged in user
// @route   PATCH /api/notifications/read-all
// @access  Private
const markAllAsRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Acknowledge a high-priority notification (sets acknowledgedAt, marks read)
//          Used by AlarmModal "Dismiss" button — prevents notification from re-showing.
// @route   PATCH /api/notifications/:id/acknowledge
// @access  Private
const acknowledgeNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.acknowledgedAt = new Date();
    notification.isRead = true;
    await notification.save();

    res.json({
      success: true,
      message: 'Notification acknowledged',
      notification
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  acknowledgeNotification
};
