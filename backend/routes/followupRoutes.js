const express = require('express');
const router = express.Router();
const {
  getMyFollowups,
  completeFollowup,
  getFollowupsByOpportunity
} = require('../controllers/followupController');
const { protect } = require('../middlewares/auth');

router.use(protect);

router.get('/me', getMyFollowups);
router.get('/opportunity/:opportunityId', getFollowupsByOpportunity);
router.patch('/:id/complete', completeFollowup);

module.exports = router;
