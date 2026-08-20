const express = require('express');
const router = express.Router();
const { getDataQualityMetrics, getDuplicateMonitorMetrics } = require('../controllers/adminMetricsController');
const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/rbac');

router.use(protect);
router.use(authorize('admin', 'super_admin', 'director'));

router.get('/data-quality', getDataQualityMetrics);
router.get('/duplicate-monitor', getDuplicateMonitorMetrics);

module.exports = router;
