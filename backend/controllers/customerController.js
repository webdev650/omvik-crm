const Customer = require('../models/Customer');
const Opportunity = require('../models/Opportunity');
const Followup = require('../models/Followup');
const SiteVisit = require('../models/SiteVisit');

// @desc    Get all customers (Scope-aware)
// @route   GET /api/customers
// @access  Private (All Roles)
const getCustomers = async (req, res, next) => {
  try {
    const scopeFilter = req.dataScopeFilter || {};

    // 1. Find opportunity IDs within caller's data scope
    const scopedOpps = await Opportunity.find(scopeFilter).select('customer owner stage project');
    const customerIds = [...new Set(scopedOpps.map(o => o.customer?.toString()).filter(Boolean))];

    // 2. Fetch Customers matching scope
    const customers = await Customer.find({ _id: { $in: customerIds } })
      .sort({ updatedAt: -1 })
      .lean();

    // 3. Attach opportunity counts & latest stage for each customer
    const customersWithStats = customers.map(c => {
      const cOpps = scopedOpps.filter(o => o.customer?.toString() === c._id.toString());
      return {
        ...c,
        opportunityCount: cOpps.length,
        projectsCount: new Set(cOpps.map(o => o.project?.toString())).size,
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

    // Fetch related follow-ups and site visits
    const oppIds = allOpportunities.map(o => o._id);
    const [followups, siteVisits] = await Promise.all([
      Followup.find({ opportunity: { $in: oppIds } }).sort({ dueAt: -1 }),
      SiteVisit.find({ opportunity: { $in: oppIds } }).sort({ scheduledAt: -1 })
    ]);

    res.json({
      success: true,
      customer,
      opportunities: allOpportunities,
      followups,
      siteVisits
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCustomers,
  getCustomerById
};
