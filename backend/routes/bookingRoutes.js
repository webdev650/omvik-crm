const express = require('express');
const router = express.Router();
const {
  createBooking,
  getBookingsByCustomer,
  updateBooking,
  getBookingByOpportunityId
} = require('../controllers/bookingController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize, applyDataScope } = require('../middlewares/rbac');

router.use(protect);

router.post('/', authorize('super_admin', 'admin', 'director', 'team_lead'), createBooking);

router.get('/customer/:customerId', applyDataScope, getBookingsByCustomer);
router.get('/opportunity/:opportunityId', applyDataScope, getBookingByOpportunityId);

router.patch(
  '/:id',
  authorize('super_admin', 'admin', 'director', 'team_lead', 'telecaller'),
  applyDataScope,
  updateBooking
);

module.exports = router;
