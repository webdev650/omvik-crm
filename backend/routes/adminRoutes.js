const express = require('express');
const router = express.Router();
const {
  getDataQualityMetrics,
  getDuplicateMonitorMetrics,
  getLoginActivity
} = require('../controllers/adminMetricsController');
const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/rbac');

router.use(protect);

// Login Activity endpoint (accessible by admin, super_admin, director, and team_lead)
router.get(
  '/login-activity',
  authorize('admin', 'super_admin', 'director', 'team_lead'),
  getLoginActivity
);

// Strictly Admin / Director endpoints
router.use(authorize('admin', 'super_admin', 'director'));

router.get('/data-quality', getDataQualityMetrics);
router.get('/duplicate-monitor', getDuplicateMonitorMetrics);

module.exports = router;
