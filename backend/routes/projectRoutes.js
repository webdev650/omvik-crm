const express = require('express');
const router = express.Router();
const {
  createProject,
  getProjects,
  getProjectById,
  updateProject
} = require('../controllers/projectController');
const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/rbac');

router.use(protect);

router
  .route('/')
  .post(authorize('super_admin', 'director', 'admin'), createProject)
  .get(getProjects);

router
  .route('/:id')
  .get(getProjectById)
  .put(authorize('super_admin', 'director', 'admin'), updateProject)
  .patch(authorize('super_admin', 'director', 'admin'), updateProject);

module.exports = router;
