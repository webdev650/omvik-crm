const Opportunity = require('../models/Opportunity');
const Followup = require('../models/Followup');

// @desc    Get dashboard summary stats (funnel, projects, sources, SLA, overdue follow-ups)
// @route   GET /api/dashboard/summary
// @access  Private — scoped by role via applyDataScope
const getDashboardStats = async (req, res, next) => {
  try {
    const scopeFilter = req.dataScope || req.scopeFilter || {};

    // Base match — always restrict to the caller's data scope AND active opportunities
    const baseMatch = { ...scopeFilter, isActive: true };

    // Run all aggregations in parallel — no sequential dependency between them
    const [
      stageAgg,
      projectAgg,
      sourceAgg,
      slaBreachedCount,
      overdueFollowups,
      totalActive,
      wonCount,
      lostCount
    ] = await Promise.all([

      // 1. Count by stage — pipeline funnel
      Opportunity.aggregate([
        { $match: baseMatch },
        { $group: { _id: '$stage', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),

      // 2. Count by project (with project name via $lookup)
      Opportunity.aggregate([
        { $match: baseMatch },
        { $group: { _id: '$project', count: { $sum: 1 } } },
        {
          $lookup: {
            from: 'projects',
            localField: '_id',
            foreignField: '_id',
            as: 'project'
          }
        },
        { $unwind: { path: '$project', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            count: 1,
            projectName: { $ifNull: ['$project.name', 'Unknown'] }
          }
        },
        { $sort: { count: -1 } }
      ]),

      // 3. Count by source
      Opportunity.aggregate([
        { $match: baseMatch },
        { $group: { _id: '$source', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),

      // 4. SLA-breached count
      Opportunity.countDocuments({ ...baseMatch, slaBreached: true }),

      // 5. Caller's own overdue follow-ups
      // owner scoping: for admin scopeFilter is {}, so we only count
      // overdue followups belonging to THIS user via req.user._id
      Followup.countDocuments({
        owner: req.user._id,
        status: { $in: ['overdue', 'missed'] }
      }),

      // 6. Total active opportunities (in caller's scope)
      Opportunity.countDocuments(baseMatch),

      // 7. Won (closed) in caller's scope — terminal stage
      Opportunity.countDocuments({ ...scopeFilter, stage: 'won' }),

      // 8. Lost (closed) in caller's scope — terminal stage
      Opportunity.countDocuments({ ...scopeFilter, stage: 'lost' })
    ]);

    // Shape stage array into a lookup map for easy frontend use:
    // { new: 4, contacted: 7, qualified: 3, ... }
    const byStage = {};
    for (const s of stageAgg) {
      byStage[s._id] = s.count;
    }

    // Fill in any missing stages with 0 so the frontend always has all keys
    const ALL_STAGES = ['new', 'contacted', 'qualified', 'site_visit', 'negotiation', 'nurture', 'won', 'lost'];
    for (const stage of ALL_STAGES) {
      if (byStage[stage] === undefined) byStage[stage] = 0;
    }

    res.json({
      success: true,
      role: req.user.role,
      stats: {
        totalActive,
        wonCount,
        lostCount,
        slaBreachedCount,
        overdueFollowups,
        byStage,
        byProject: projectAgg.map(p => ({
          projectId: p._id,
          projectName: p.projectName,
          count: p.count
        })),
        bySource: sourceAgg.map(s => ({
          source: s._id || 'unknown',
          count: s.count
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboardStats };
