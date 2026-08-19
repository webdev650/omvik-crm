const express = require('express');
const router = express.Router();
const {
  createTeam,
  getTeams,
  getTeamById,
  updateTeam,
  addMemberToTeam
} = require('../controllers/teamController');
const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/rbac');

router.use(protect);

router
  .route('/')
  .post(authorize('super_admin', 'director', 'admin'), createTeam)
  .get(getTeams);

router
  .route('/:id')
  .get(getTeamById)
  .put(authorize('super_admin', 'director', 'admin'), updateTeam)
  .patch(authorize('super_admin', 'director', 'admin'), updateTeam);

router
  .route('/:id/members')
  .post(authorize('super_admin', 'director', 'admin', 'team_lead'), addMemberToTeam);

module.exports = router;
