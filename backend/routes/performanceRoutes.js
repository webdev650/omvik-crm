const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/rbac');
const {
  getTeamPerformance,
  getEmployeeTeamDetail
} = require('../controllers/performanceController');

// All performance routes require authentication
router.use(protect);

// Team performance endpoints restricted to admin, super_admin, director, team_lead
// (Returns 403 Forbidden for telecallers, field executives, etc.)
router.get(
  '/team',
  authorize('super_admin', 'admin', 'director', 'team_lead'),
  getTeamPerformance
);

router.get(
  '/team/:userId',
  authorize('super_admin', 'admin', 'director', 'team_lead'),
  getEmployeeTeamDetail
);

module.exports = router;
