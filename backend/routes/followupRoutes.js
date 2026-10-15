const express = require('express');
const router = express.Router();
const {
  getMyFollowups,
  completeFollowup,
  getFollowupsByOpportunity,
  getFollowupSummary
} = require('../controllers/followupController');
const { protect } = require('../middlewares/auth');
const { applyDataScope } = require('../middlewares/rbac');

router.use(protect);

router.get('/summary', applyDataScope, getFollowupSummary);
router.get('/me', applyDataScope, getMyFollowups);
router.get('/opportunity/:opportunityId', applyDataScope, getFollowupsByOpportunity);
router.patch('/:id/complete', completeFollowup);

module.exports = router;
