const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/rbac');

const admin = authorize('super_admin', 'admin', 'director');

router.route('/')
  .get(postController.getPosts)
  .post(protect, admin, postController.createPost);

router.route('/:id')
  .get(postController.getPostById)
  .put(protect, admin, postController.updatePost)
  .delete(protect, admin, postController.deletePost);

module.exports = router;
