const Customer = require('../models/Customer');
const Opportunity = require('../models/Opportunity');
const Followup = require('../models/Followup');
const SiteVisit = require('../models/SiteVisit');
const Booking = require('../models/Booking');

// @desc    Get all customers (Scope-aware)
// @route   GET /api/customers
// @access  Private (All Roles)
const getCustomers = async (req, res, next) => {
  try {
    const scopeFilter = req.dataScope || req.scopeFilter || req.dataScopeFilter || {};
    const role = req.user?.role || 'telecaller';
    const isFullAccess = ['super_admin', 'admin', 'director'].includes(role) || Object.keys(scopeFilter).length === 0;

    let customers = [];
    let scopedOpps = [];

    if (isFullAccess) {
      customers = await Customer.find({}).sort({ updatedAt: -1 }).lean();
      scopedOpps = await Opportunity.find({}).select('customer owner stage project').lean();
    } else {
      scopedOpps = await Opportunity.find(scopeFilter).select('customer owner stage project').lean();
      const scopedBookings = await Booking.find(scopeFilter).select('customer assignedTo').lean();

      const customerIds = [
        ...new Set([
          ...scopedOpps.map(o => o.customer?.toString()),
          ...scopedBookings.map(b => b.customer?.toString())
        ].filter(Boolean))
      ];

      customers = await Customer.find({
        $or: [
          { _id: { $in: customerIds } },
          { createdBy: req.user._id }
        ]
      })
        .sort({ updatedAt: -1 })
        .lean();
    }

    const customersWithStats = customers.map(c => {
      const cOpps = scopedOpps.filter(o => o.customer?.toString() === c._id.toString());
      return {
        ...c,
        opportunityCount: cOpps.length || 1,
        projectsCount: new Set(cOpps.map(o => o.project?.toString())).size || 1,
        latestStage: cOpps[0]?.stage || 'new'
      };
    });

    res.json({
      success: true,
      count: customersWithStats.length,
      customers: customersWithStats
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Customer 360 profile with all multi-project opportunities & activities
// @route   GET /api/customers/:id
// @access  Private (Scope-aware)
const getCustomerById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer profile not found' });
    }

    // Fetch all opportunities for this customer
    const allOpportunities = await Opportunity.find({ customer: id })
      .sort({ createdAt: -1 })
      .populate('project', 'name code location')
      .populate('owner', 'name email role employeeId');

    // Scope check: If caller is not admin/director, verify they own at least one opportunity for this customer
    const isAdmin = ['super_admin', 'admin', 'director'].includes(req.user.role);
    const ownsAnyOpportunity = allOpportunities.some(o => o.owner?._id?.toString() === req.user._id.toString());

    if (!isAdmin && !ownsAnyOpportunity) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to view this customer profile' });
    }

    // Fetch related follow-ups, site visits and bookings
    const oppIds = allOpportunities.map(o => o._id);
    const [followups, siteVisits, bookings] = await Promise.all([
      Followup.find({ opportunity: { $in: oppIds } }).sort({ dueAt: -1 }),
      SiteVisit.find({ opportunity: { $in: oppIds } }).sort({ scheduledAt: -1 }),
      Booking.find({ customer: id })
        .populate('project', 'name code location propertyType')
        .populate('opportunity', 'stage value')
        .populate('assignedTo', 'name email role')
        .sort({ bookingDate: -1 })
    ]);

    res.json({
      success: true,
      customer,
      opportunities: allOpportunities,
      followups,
      siteVisits,
      bookings
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCustomers,
  getCustomerById
};
