const express = require('express');
const router = express.Router();
const { getMyPerformance, getEmployeeHistory } = require('../controllers/reportController');
const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/rbac');

// All report routes require authentication
router.use(protect);

// Self performance report available to EVERY role
router.get('/me', getMyPerformance);

// Employee date-filtered history drilldown (admin, super_admin, director, team_lead)
router.get('/employee-history/:userId', authorize('super_admin', 'admin', 'director', 'team_lead'), getEmployeeHistory);

module.exports = router;
