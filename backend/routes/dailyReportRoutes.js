const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/rbac');
const {
  submitDailyReport,
  getTodayReport,
  getFlaggedReports,
  getTeamOverview
} = require('../controllers/dailyReportController');

router.use(protect);

router.post('/', submitDailyReport);
router.get('/today', getTodayReport);
router.get('/flagged', authorize('super_admin', 'admin', 'director'), getFlaggedReports);
router.get('/team-overview', authorize('super_admin', 'admin', 'director', 'team_lead'), getTeamOverview);

module.exports = router;
