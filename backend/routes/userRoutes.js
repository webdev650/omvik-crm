const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  updateOwnProfile,
  offboardUser,
  getUserActiveOppCount
} = require('../controllers/userController');
const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/rbac');

// All user management routes require authentication
router.use(protect);

// Self-service profile update route for all logged in users (placed before /:id)
router.patch('/me', updateOwnProfile);

router.get('/:id/active-opportunities-count', authorize('super_admin', 'admin', 'director'), getUserActiveOppCount);
router.post('/:id/offboard', authorize('super_admin', 'admin'), offboardUser);

router
  .route('/')
  .get(authorize('super_admin', 'admin', 'director'), getUsers)
  .post(authorize('super_admin', 'admin'), createUser);

router
  .route('/:id')
  .get(authorize('super_admin', 'admin', 'director'), getUserById)
  .patch(authorize('super_admin', 'admin'), updateUser);

module.exports = router;
