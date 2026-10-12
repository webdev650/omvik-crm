const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const { getAssistantMessage } = require('../controllers/assistantController');

// @route   GET /api/assistant/message
// @desc    Get role-based, task-aware Omvik Assistant message
// @access  Private (protected)
router.get('/message', protect, getAssistantMessage);

module.exports = router;
