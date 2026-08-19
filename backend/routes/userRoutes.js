const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUserById,
  createUser,
  updateUser
} = require('../controllers/userController');
const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/rbac');

// All user management routes require authentication
router.use(protect);

router
  .route('/')
  .get(authorize('super_admin', 'admin', 'director'), getUsers)
  .post(authorize('super_admin', 'admin'), createUser);

router
  .route('/:id')
  .get(authorize('super_admin', 'admin', 'director'), getUserById)
  .patch(authorize('super_admin', 'admin'), updateUser);

module.exports = router;
