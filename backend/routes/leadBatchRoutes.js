const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const { authorizeRoles } = require('../middlewares/roleCheck');
const { applyDataScope } = require('../middlewares/dataScope');
const { getLeadBatches, getBatchLeads } = require('../controllers/leadBatchController');

router.use(protect);
router.use(authorizeRoles('super_admin', 'admin', 'director', 'team_lead'));
router.use(applyDataScope);

router.get('/', getLeadBatches);
router.get('/:batchId', getBatchLeads);

module.exports = router;
