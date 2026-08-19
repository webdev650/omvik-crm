const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const { submitLead, overrideDuplicateLead } = require('../controllers/leadController');
const { previewImport, confirmImport } = require('../controllers/importController');
const { exportLeads } = require('../controllers/exportController');
const { protect } = require('../middlewares/auth');
const { authorize, applyDataScope } = require('../middlewares/rbac');

router.use(protect);

router.get('/export', applyDataScope, authorize('super_admin', 'admin', 'director', 'team_lead'), exportLeads);
router.post('/', submitLead);
router.post('/override', authorize('super_admin'), overrideDuplicateLead);
router.post('/import/preview', authorize('super_admin', 'admin', 'director'), upload.single('file'), previewImport);
router.post('/import/confirm', authorize('super_admin', 'admin', 'director'), confirmImport);

module.exports = router;
