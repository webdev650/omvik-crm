const express = require('express');
const router = express.Router();
const { getMyPerformance } = require('../controllers/reportController');
const { protect } = require('../middlewares/auth');

// All report routes require authentication
router.use(protect);

// Self performance report available to EVERY role
router.get('/me', getMyPerformance);

module.exports = router;
