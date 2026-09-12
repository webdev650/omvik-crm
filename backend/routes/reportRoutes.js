const express = require('express');
const router = express.Router();
const { getMyPerformance, getEmployeeHistory, getExecutiveKpis } = require('../controllers/reportController');
const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/rbac');

// All report routes require authentication
router.use(protect);

// Self performance report available to EVERY role
router.get('/me', getMyPerformance);

// Executive Dashboard 21 KPIs (admin, super_admin, director, team_lead)
router.get('/executive-kpis', authorize('super_admin', 'admin', 'director', 'team_lead'), getExecutiveKpis);

// Employee date-filtered history drilldown (admin, super_admin, director, team_lead)
router.get('/employee-history/:userId', authorize('super_admin', 'admin', 'director', 'team_lead'), getEmployeeHistory);

module.exports = router;
