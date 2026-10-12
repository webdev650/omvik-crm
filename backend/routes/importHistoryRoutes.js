const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/rbac');
const {
  getImportHistory,
  getBatchLeadsDetail,
  getBatchReassignOptions,
  reassignBatchLeads
} = require('../controllers/importHistoryController');

// All import history endpoints require authentication & admin oversight
router.use(protect);
router.use(authorize('super_admin', 'admin', 'director', 'team_lead'));

router.get('/', getImportHistory);
router.get('/:batchId/leads', getBatchLeadsDetail);
router.get('/:batchId/reassign-options', getBatchReassignOptions);
router.post('/:batchId/reassign', reassignBatchLeads);

module.exports = router;
