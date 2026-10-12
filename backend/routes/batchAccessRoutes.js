const express = require('express');
const router = express.Router();
const {
  createBatchAccess,
  getMyAccessibleBatches,
  revokeBatchAccess,
  getAllBatchAccess
} = require('../controllers/batchAccessController');
const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/rbac');

router.use(protect);

// Employee sees only their assigned sheets (also accessible via /api/my-accessible-batches)
router.get('/my-accessible-batches', getMyAccessibleBatches);

// Admin batch access management
router.get('/', authorize('super_admin', 'admin', 'director'), getAllBatchAccess);
router.post('/', authorize('super_admin', 'admin', 'director'), createBatchAccess);
router.delete('/:id', authorize('super_admin', 'admin', 'director'), revokeBatchAccess);

module.exports = router;
