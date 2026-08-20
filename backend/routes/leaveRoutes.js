const express = require('express');
const router = express.Router();
const { requestLeave, getLeaves, decideLeave, getActiveLeaves } = require('../controllers/leaveController');
const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/rbac');

router.use(protect);

router.post('/', requestLeave);
router.get('/', getLeaves);
router.get('/active-now', getActiveLeaves);
router.patch('/:id/decide', authorize('super_admin', 'admin', 'director'), decideLeave);

module.exports = router;
