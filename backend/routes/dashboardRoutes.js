const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../controllers/dashboardController');
const { protect } = require('../middlewares/auth');
const { applyDataScope } = require('../middlewares/rbac');

router.use(protect);

// GET /api/dashboard/summary
// Scoped by role — admin sees everything, telecaller sees only their own
router.get('/summary', applyDataScope, getDashboardStats);

module.exports = router;
