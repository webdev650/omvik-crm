const express = require('express');
const router = express.Router();
const {
  logActivity,
  getActivities
} = require('../controllers/activityController');
const { protect } = require('../middlewares/auth');
const { applyDataScope } = require('../middlewares/rbac');

router.use(protect);

router.post('/:id/activities', applyDataScope, logActivity);
router.get('/:id/activities', applyDataScope, getActivities);

module.exports = router;
