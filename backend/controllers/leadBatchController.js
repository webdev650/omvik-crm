const Opportunity = require('../models/Opportunity');

// @desc    Get summary list of all import batches with lead counts
// @route   GET /api/admin/lead-batches
// @access  Private (admin, super_admin, director)
const getLeadBatches = async (req, res, next) => {
  try {
    const scopeFilter = req.dataScope || {};

    const batchAgg = await Opportunity.aggregate([
      { $match: scopeFilter },
      {
        $group: {
          _id: { $ifNull: ['$importBatchId', 'MANUAL / WEBSITE'] },
          totalLeads: { $sum: 1 },
          activeLeads: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
          wonDeals: { $sum: { $cond: [{ $eq: ['$stage', 'won'] }, 1, 0] } },
          lastImportedAt: { $max: '$createdAt' }
        }
      },
      { $sort: { lastImportedAt: -1 } }
    ]);

    const batches = batchAgg.map((b) => ({
      batchId: b._id,
      batchName: b._id,
      totalLeads: b.totalLeads,
      activeLeads: b.activeLeads,
      wonDeals: b.wonDeals,
      lastImportedAt: b.lastImportedAt
    }));

    res.json({
      success: true,
      count: batches.length,
      batches
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get leads inside a specific import batch with search/filtering
// @route   GET /api/admin/lead-batches/:batchId
// @access  Private (admin, super_admin, director)
const getBatchLeads = async (req, res, next) => {
  try {
    const { batchId } = req.params;
    const { search, stage, page = 1, limit = 50 } = req.query;

    const query = {
      ...(req.dataScope || {})
    };

    if (batchId === 'MANUAL / WEBSITE' || batchId === 'manual') {
      query.importBatchId = { $in: [null, '', 'MANUAL / WEBSITE', 'manual'] };
    } else {
      query.importBatchId = batchId;
    }

    if (stage) {
      query.stage = stage;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [total, opportunities] = await Promise.all([
      Opportunity.countDocuments(query),
      Opportunity.find(query)
        .populate('customer', 'name primaryMobile email city')
        .populate('project', 'name code')
        .populate('owner', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
    ]);

    // Optional in-memory filter if customer search term provided
    let filteredOpps = opportunities;
    if (search && String(search).trim()) {
      const q = String(search).trim().toLowerCase();
      filteredOpps = opportunities.filter(
        (opp) =>
          opp.customer?.name?.toLowerCase().includes(q) ||
          opp.customer?.primaryMobile?.includes(q) ||
          opp.project?.name?.toLowerCase().includes(q) ||
          opp.owner?.name?.toLowerCase().includes(q)
      );
    }

    res.json({
      success: true,
      batchId,
      total,
      count: filteredOpps.length,
      opportunities: filteredOpps
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLeadBatches,
  getBatchLeads
};
