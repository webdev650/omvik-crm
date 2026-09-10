const express = require('express');
const router = express.Router();
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  acknowledgeNotification
} = require('../controllers/notificationController');
const { protect } = require('../middlewares/auth');

router.use(protect);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);
router.patch('/:id/acknowledge', acknowledgeNotification);

module.exports = router;
