const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../controllers/dashboardController');
const { getEmployeeSummary } = require('../controllers/employeeSummaryController');
const { protect } = require('../middlewares/auth');
const { applyDataScope } = require('../middlewares/rbac');

router.use(protect);

// GET /api/dashboard/summary
// Scoped by role — admin sees everything, telecaller sees only their own
router.get('/summary', applyDataScope, getDashboardStats);

// GET /api/dashboard/employee-summary
// Telecaller-scoped personal dashboard — always returns data for the logged-in user only
router.get('/employee-summary', getEmployeeSummary);

module.exports = router;

