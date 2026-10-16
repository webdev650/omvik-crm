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

const { autoSaveImport } = require('../controllers/importController');
const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/rbac');

router.use(protect);
router.use(authorize('super_admin', 'admin', 'director', 'team_lead'));

router.post('/', upload.single('file'), autoSaveImport);

module.exports = router;
