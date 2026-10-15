const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const { authorize, applyDataScope } = require('../middlewares/rbac');
const { getLeadBatches, getBatchLeads, reassignBatchLeads, deleteLeadBatch } = require('../controllers/leadBatchController');

router.use(protect);

// Read & Reassign routes (admin, super_admin, director, team_lead)
router.get('/', authorize('super_admin', 'admin', 'director', 'team_lead'), applyDataScope, getLeadBatches);
router.get('/:batchId', authorize('super_admin', 'admin', 'director', 'team_lead'), applyDataScope, getBatchLeads);
router.post('/:batchId/reassign', authorize('super_admin', 'admin', 'director', 'team_lead'), applyDataScope, reassignBatchLeads);

// CRITICAL: Deleting lead lists / batches is strictly RESTRICTED TO ADMIN ONLY (super_admin & admin)
router.delete('/', authorize('super_admin', 'admin'), deleteLeadBatch);
router.delete('/:batchId', authorize('super_admin', 'admin'), deleteLeadBatch);
router.post('/delete-batch', authorize('super_admin', 'admin'), deleteLeadBatch);
router.post('/:batchId/delete', authorize('super_admin', 'admin'), deleteLeadBatch);

module.exports = router;
