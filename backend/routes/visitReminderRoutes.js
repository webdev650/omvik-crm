const express = require('express');
const router = express.Router();
const VisitReminder = require('../models/VisitReminder');
const Notification = require('../models/Notification');
const { protect } = require('../middlewares/auth');

router.use(protect);

// @desc    Snooze a visit reminder — finds the siteVisit via notification,
//          creates a new VisitReminder 10 minutes out, acknowledges the notification.
// @route   POST /api/visit-reminders/snooze
// @body    { notificationId: string }
// @access  Private
router.post('/snooze', async (req, res, next) => {
  try {
    const { notificationId } = req.body;

    if (!notificationId) {
      return res.status(400).json({ message: 'notificationId is required' });
    }

    // Find and acknowledge the source notification
    const notification = await Notification.findOne({
      _id: notificationId,
      user: req.user._id,
      priority: 'high',
      type: 'visit_reminder'
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found or already acknowledged' });
    }

    // Find a recently fired VisitReminder (fired=true, not acknowledged) to get the siteVisit ref
    // We look back up to 10 minutes to catch the reminder that triggered this notification
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const sourceReminder = await VisitReminder.findOne({
      fired: true,
      updatedAt: { $gte: tenMinutesAgo }
    }).sort({ updatedAt: -1 });

    let snoozedReminder = null;

    if (sourceReminder) {
      // Create a new reminder 10 minutes from now
      const snoozeFor = new Date(Date.now() + 10 * 60 * 1000);
      snoozedReminder = await VisitReminder.create({
        siteVisit:    sourceReminder.siteVisit,
        type:         'final_reminder',
        scheduledFor: snoozeFor,
        fired:        false
      });
    }

    // Acknowledge the notification
    notification.acknowledgedAt = new Date();
    notification.isRead = true;
    await notification.save();

    res.json({
      success: true,
      message: snoozedReminder
        ? `Snoozed — new reminder will fire at ${snoozedReminder.scheduledFor.toISOString()}`
        : 'Notification acknowledged (could not find source reminder to snooze)',
      snoozedReminder
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
