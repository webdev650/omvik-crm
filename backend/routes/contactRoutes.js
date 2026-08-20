const express = require('express');
const router = express.Router();
const {
  submitContactForm,
  getContactSubmissions,
  updateContactStatus,
} = require('../controllers/contactController');
const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/rbac');

const admin = authorize('super_admin', 'admin', 'director');

router.route('/').post(submitContactForm).get(protect, admin, getContactSubmissions);
router.route('/:id').put(protect, admin, updateContactStatus);

module.exports = router;
