const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const Opportunity = require('../models/Opportunity');
const Followup = require('../models/Followup');
const SiteVisit = require('../models/SiteVisit');
const Booking = require('../models/Booking');

// In-memory cache for summary counts (TTL: 45 seconds)
const summaryCache = {};

// @desc    Get all customers with high-performance pagination, lookup aggregation, and search
// @route   GET /api/customers
// @access  Private (All Roles - Scope-aware)
const getCustomers = async (req, res, next) => {
  const startTime = performance.now();
  try {
    const scopeFilter = req.dataScope || req.scopeFilter || req.dataScopeFilter || {};
    const role = req.user?.role || 'telecaller';
    const isFullAccess = ['super_admin', 'admin', 'director'].includes(role) || Object.keys(scopeFilter).length === 0;

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const skip = (page - 1) * limit;
    const search = req.query.search ? String(req.query.search).trim() : '';
    const sort = req.query.sort ? String(req.query.sort).trim() : '-createdAt';

    let matchQuery = {};

    // 1. Data scoping: non-privileged users only see their own customers
    if (!isFullAccess) {
      const [scopedOppCustomerIds, scopedBookingCustomerIds] = await Promise.all([
        Opportunity.distinct('customer', scopeFilter),
        Booking.distinct('customer', scopeFilter)
      ]);

      const customerIdSet = new Set([
        ...scopedOppCustomerIds.map(String),
        ...scopedBookingCustomerIds.map(String)
      ]);

      const validObjectIds = Array.from(customerIdSet)
        .filter(id => mongoose.Types.ObjectId.isValid(id))
        .map(id => new mongoose.Types.ObjectId(id));

      matchQuery.$or = [
        { _id: { $in: validObjectIds } },
        { owner: req.user._id },
        { createdBy: req.user._id }
      ];
    }

    // 2. Database search across indexed fields
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escaped, 'i');
      const searchConditions = [
        { name: searchRegex },
        { primaryMobile: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
        { city: searchRegex }
      ];

      if (matchQuery.$or) {
        matchQuery = {
          $and: [
            { $or: matchQuery.$or },
            { $or: searchConditions }
          ]
        };
      } else {
        matchQuery.$or = searchConditions;
      }
    }

    // 3. Database sorting
    let sortStage = { createdAt: -1 };
    if (sort) {
      if (sort === 'name' || sort === 'name_asc') sortStage = { name: 1 };
      else if (sort === '-name' || sort === 'name_desc') sortStage = { name: -1 };
      else if (sort === 'createdAt' || sort === 'oldest') sortStage = { createdAt: 1 };
      else if (sort === '-createdAt' || sort === 'newest') sortStage = { createdAt: -1 };
      else if (sort === 'updatedAt') sortStage = { updatedAt: 1 };
      else if (sort === '-updatedAt') sortStage = { updatedAt: -1 };
      else if (sort.startsWith('-')) sortStage = { [sort.slice(1)]: -1 };
      else sortStage = { [sort]: 1 };
    }

    // 4. Summary counts with 45s in-memory cache
    const now = Date.now();
    const cacheKey = isFullAccess ? 'all' : (req.user?._id?.toString() || 'user');
    let summaryPromise;

    if (summaryCache[cacheKey] && summaryCache[cacheKey].expiry > now) {
      summaryPromise = Promise.resolve(summaryCache[cacheKey].data);
    } else {
      const bookingScope = isFullAccess ? {} : scopeFilter;
      summaryPromise = Booking.aggregate([
        { $match: bookingScope },
        {
          $group: {
            _id: null,
            totalBookedUnits: { $sum: 1 },
            totalRevenue: { $sum: { $ifNull: ['$finalPrice', '$totalCost', 0] } }
          }
        }
      ]).then(([agg]) => {
        const result = {
          totalBookedUnits: agg?.totalBookedUnits || 0,
          totalRevenue: agg?.totalRevenue || 0
        };
        summaryCache[cacheKey] = {
          data: result,
          expiry: now + 45000 // Cache for 45s (30-60s requirement)
        };
        return result;
      });
    }

    // 5. Query execution: Count + Aggregation lookup for 25 items + Summary in parallel
    const [total, customers, summary] = await Promise.all([
      Customer.countDocuments(matchQuery),
      Customer.aggregate([
        { $match: matchQuery },
        { $sort: sortStage },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'opportunities',
            let: { custId: '$_id' },
            pipeline: [
              { $match: { $expr: { $eq: ['$customer', '$$custId'] } } },
              { $project: { _id: 1, stage: 1, project: 1, owner: 1 } },
              {
                $lookup: {
                  from: 'projects',
                  localField: 'project',
                  foreignField: '_id',
                  pipeline: [{ $project: { name: 1, code: 1 } }],
                  as: 'project'
                }
              },
              { $unwind: { path: '$project', preserveNullAndEmptyArrays: true } },
              {
                $lookup: {
                  from: 'users',
                  localField: 'owner',
                  foreignField: '_id',
                  pipeline: [{ $project: { name: 1, email: 1, employeeId: 1 } }],
                  as: 'owner'
                }
              },
              { $unwind: { path: '$owner', preserveNullAndEmptyArrays: true } }
            ],
            as: 'opportunities'
          }
        },
        {
          $lookup: {
            from: 'bookings',
            let: { custId: '$_id' },
            pipeline: [
              { $match: { $expr: { $eq: ['$customer', '$$custId'] } } },
              { $project: { _id: 1, finalPrice: 1, totalCost: 1, unitNumber: 1, bookingDate: 1 } }
            ],
            as: 'bookings'
          }
        },
        {
          $project: {
            name: 1,
            primaryMobile: 1,
            phone: 1,
            email: 1,
            city: 1,
            createdAt: 1,
            updatedAt: 1,
            opportunityCount: {
              $cond: [{ $gt: [{ $size: '$opportunities' }, 0] }, { $size: '$opportunities' }, 1]
            },
            latestStage: { $ifNull: [{ $arrayElemAt: ['$opportunities.stage', 0] }, 'new'] },
            bookingsCount: { $size: '$bookings' },
            opportunities: 1,
            bookings: 1
          }
        }
      ]),
      summaryPromise
    ]);

    const pages = Math.ceil(total / limit) || 1;

    const responsePayload = {
      success: true,
      data: customers,
      customers, // backwards compatibility
      total,
      count: customers.length,
      page,
      pages,
      summary: {
        totalCustomers: total,
        totalBookedUnits: summary.totalBookedUnits,
        totalRevenue: summary.totalRevenue
      }
    };

    const queryDurationMs = (performance.now() - startTime).toFixed(2);
    const jsonString = JSON.stringify(responsePayload);
    const payloadSizeKB = (Buffer.byteLength(jsonString, 'utf8') / 1024).toFixed(2);

    console.log(`[TIMING: GET /api/customers] Query Time: ${queryDurationMs}ms | Documents: ${customers.length} (Total: ${total}) | Response Size: ${payloadSizeKB}KB | Page: ${page}/${pages}`);

    res.json(responsePayload);
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

    // Permission check: Access to Customer 360 is restricted to admin/leadership roles
    const isPrivileged = ['super_admin', 'admin', 'director', 'team_lead'].includes(req.user.role);

    if (!isPrivileged) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to view Customer 360 profiles' });
    }

    // Fetch related follow-ups, site visits and bookings
    const oppIds = allOpportunities.map((o) => o._id);
    const [followups, siteVisits, bookings] = await Promise.all([
      Followup.find({ opportunity: { $in: oppIds } }).sort({ dueAt: -1 }),
      SiteVisit.find({ opportunity: { $in: oppIds } }).sort({ scheduledAt: -1 }),
      Booking.find({
        $or: [{ customer: id }, { opportunity: { $in: oppIds } }]
      })
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
