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
const { deleteLeadBatch } = require('../controllers/leadBatchController');

// All import history endpoints require authentication & admin oversight
router.use(protect);

router.get('/', authorize('super_admin', 'admin', 'director', 'team_lead'), getImportHistory);
router.get('/:batchId/leads', authorize('super_admin', 'admin', 'director', 'team_lead'), getBatchLeadsDetail);
router.get('/:batchId/reassign-options', authorize('super_admin', 'admin', 'director', 'team_lead'), getBatchReassignOptions);
router.post('/:batchId/reassign', authorize('super_admin', 'admin', 'director', 'team_lead'), reassignBatchLeads);

// CRITICAL: Lead list deletion strictly restricted to admin only
router.delete('/:batchId', authorize('super_admin', 'admin'), deleteLeadBatch);
router.delete('/', authorize('super_admin', 'admin'), deleteLeadBatch);

module.exports = router;
