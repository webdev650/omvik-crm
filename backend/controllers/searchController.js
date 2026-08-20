const Customer = require('../models/Customer');
const Opportunity = require('../models/Opportunity');

// @desc    Global scope-aware search for customers & opportunities
// @route   GET /api/search?q=query
// @access  Private (Scope-aware)
const globalSearch = async (req, res, next) => {
  try {
    const queryStr = (req.query.q || '').trim();
    if (!queryStr || queryStr.length < 2) {
      return res.json({ success: true, results: [] });
    }

    const regex = new RegExp(queryStr, 'i');
    const scopeFilter = req.dataScopeFilter || {};

    // 1. Find opportunities matching query in caller's data scope
    const opps = await Opportunity.find({
      ...scopeFilter,
      $or: [
        { rawName: regex },
        { source: regex },
        { campaign: regex }
      ]
    })
      .limit(10)
      .populate('customer', 'name primaryMobile email')
      .populate('project', 'name code')
      .lean();

    // 2. Find customer IDs in caller's scope to filter customer search
    const scopedOppsAll = await Opportunity.find(scopeFilter).select('customer').lean();
    const allowedCustomerIds = [...new Set(scopedOppsAll.map(o => o.customer?.toString()).filter(Boolean))];

    const customerMatchQuery = {
      $or: [
        { name: regex },
        { primaryMobile: regex },
        { alternateMobile: regex },
        { email: regex }
      ]
    };

    // If caller is non-admin, filter customers strictly by allowed IDs
    const isAdmin = ['super_admin', 'admin', 'director'].includes(req.user.role);
    if (!isAdmin) {
      customerMatchQuery._id = { $in: allowedCustomerIds };
    }

    const customers = await Customer.find(customerMatchQuery).limit(10).lean();

    // 3. Format into unified results array
    const results = [];

    customers.forEach((c) => {
      results.push({
        type: 'customer',
        id: c._id,
        label: c.name,
        sublabel: `📱 ${c.primaryMobile}${c.email ? ' | ' + c.email : ''}`,
        link: `/customers/${c._id}`
      });
    });

    opps.forEach((o) => {
      const custName = o.customer?.name || o.rawName || 'Lead Opportunity';
      const projName = o.project?.name || 'Project';
      results.push({
        type: 'opportunity',
        id: o._id,
        label: `${custName} — ${projName}`,
        sublabel: `Stage: ${(o.stage || 'new').toUpperCase()} | Source: ${o.source || 'direct'}`,
        link: `/leads/${o._id}`
      });
    });

    res.json({
      success: true,
      count: results.length,
      results: results.slice(0, 20)
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  globalSearch
};
