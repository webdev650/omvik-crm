const express = require('express');
const router = express.Router();
const {
  assignOne,
  bulkAssign,
  getOpportunities,
  getOpportunityById,
  updateStage,
  updateIntent,
  getProjectTeamStats
} = require('../controllers/opportunityController');
const { protect } = require('../middlewares/auth');
const { authorize, applyDataScope } = require('../middlewares/rbac');

router.use(protect);

router.get('/', applyDataScope, getOpportunities);

// Must be before /:id to avoid param conflict
router.get('/project-team-stats', applyDataScope, getProjectTeamStats);

router.patch(
  '/bulk-assign',
  authorize('super_admin', 'director', 'admin', 'team_lead'),
  bulkAssign
);
router.get('/:id', applyDataScope, getOpportunityById);
router.patch('/:id/stage', applyDataScope, updateStage);
router.patch('/:id/intent', applyDataScope, updateIntent);
router.patch(
  '/:id/assign',
  authorize('super_admin', 'director', 'admin', 'team_lead'),
  assignOne
);

module.exports = router;
