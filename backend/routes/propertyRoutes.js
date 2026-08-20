const express = require('express');
const router = express.Router();
const {
  registerProperty,
  getProperties,
  updatePropertyStatus,
} = require('../controllers/propertyController');
const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/rbac');
const { upload } = require('../config/cloudinary');

const admin = authorize('super_admin', 'admin', 'director');

router.route('/').post(upload.array('images', 5), registerProperty).get(protect, admin, getProperties);
router.route('/:id').put(protect, admin, updatePropertyStatus);

module.exports = router;
