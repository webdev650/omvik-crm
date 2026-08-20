const express = require('express');
const router = express.Router();
const { globalSearch } = require('../controllers/searchController');
const { protect } = require('../middlewares/auth');
const { applyDataScope } = require('../middlewares/rbac');

router.use(protect);
router.get('/', applyDataScope, globalSearch);

module.exports = router;
