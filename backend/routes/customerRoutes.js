const express = require('express');
const router = express.Router();
const { getCustomers, getCustomerById } = require('../controllers/customerController');
const { protect } = require('../middlewares/auth');
const { applyDataScope } = require('../middlewares/rbac');

router.use(protect);

router.get('/', applyDataScope, getCustomers);
router.get('/:id', getCustomerById);

module.exports = router;
