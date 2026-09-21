const express = require('express');
const router = express.Router();
const { getCustomers, getCustomerById } = require('../controllers/customerController');
const { protect } = require('../middlewares/auth');
const { applyDataScope, authorize } = require('../middlewares/rbac');

router.use(protect);
router.use(authorize('admin', 'super_admin', 'director', 'team_lead'));

router.get('/', applyDataScope, getCustomers);
router.get('/:id', getCustomerById);

module.exports = router;
