const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.xlsx', '.xls', '.csv'].includes(ext)) {
      return cb(new Error('Invalid file type. Only .xlsx, .xls, and .csv files are permitted.'));
    }
    cb(null, true);
  }
});

const {
  getLeads,
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

router.get('/', applyDataScope, getLeads);
router.get('/export', applyDataScope, exportLeads);
router.get('/by-date', applyDataScope, getLeadsByDate);
router.get('/date-summary', applyDataScope, getLeadsDateSummary);
router.post('/', submitLead);
router.post('/override', authorize('super_admin'), overrideDuplicateLead);
router.post('/import', authorize('super_admin', 'admin', 'director', 'team_lead'), upload.single('file'), autoSaveImport);
router.post('/import/preview', authorize('super_admin', 'admin', 'director', 'team_lead'), upload.single('file'), previewImport);
router.post('/import/confirm', authorize('super_admin', 'admin', 'director', 'team_lead'), confirmImport);

module.exports = router;
