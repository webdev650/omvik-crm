const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const { autoSaveImport } = require('../controllers/importController');
const { protect } = require('../middlewares/auth');

router.use(protect);

router.post('/', upload.single('file'), autoSaveImport);

module.exports = router;
