const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const {
  submitLead,
  overrideDuplicateLead,
  getLeadsByDate,
  getLeadsDateSummary
} = require('../controllers/leadController');
const { autoSaveImport, previewImport, confirmImport } = require('../controllers/importController');
const { exportLeads } = require('../controllers/exportController');
const { protect } = require('../middlewares/auth');
const { authorize, applyDataScope } = require('../middlewares/rbac');

router.use(protect);

router.get('/export', applyDataScope, exportLeads);
router.get('/by-date', applyDataScope, getLeadsByDate);
router.get('/date-summary', applyDataScope, getLeadsDateSummary);
router.post('/', submitLead);
router.post('/override', authorize('super_admin'), overrideDuplicateLead);
router.post('/import', upload.single('file'), autoSaveImport);
router.post('/import/preview', upload.single('file'), previewImport);
router.post('/import/confirm', confirmImport);

module.exports = router;
