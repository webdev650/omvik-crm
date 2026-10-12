const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/rbac');
const {
  getEmployeeWorkHistory,
  getEmployeeBatchSummary
} = require('../controllers/employeeWorkHistoryController');

router.use(protect);
router.use(authorize('super_admin', 'admin', 'director', 'team_lead', 'telecaller'));

router.get('/:empId/work-history', getEmployeeWorkHistory);
router.get('/:empId/batch-summary/:batchId', getEmployeeBatchSummary);

module.exports = router;
