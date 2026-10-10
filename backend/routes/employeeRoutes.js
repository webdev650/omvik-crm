const express = require('express');
const router = express.Router();
const {
  getEmployeeWorkHistory,
  getEmployeeBatchSummary
} = require('../controllers/employeeWorkHistoryController');

router.get('/:empId/work-history', getEmployeeWorkHistory);
router.get('/:empId/batch-summary/:batchId', getEmployeeBatchSummary);

module.exports = router;
