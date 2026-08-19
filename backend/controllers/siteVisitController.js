const SiteVisit = require('../models/SiteVisit');
const Opportunity = require('../models/Opportunity');

// @desc    Schedule a new site visit for an opportunity
// @route   POST /api/opportunities/:id/site-visits
// @access  Private
const scheduleSiteVisit = async (req, res, next) => {
  try {
    const { scheduledAt, notes } = req.body;
    const opportunityId = req.params.id;

    if (!scheduledAt) {
      return res.status(400).json({ message: 'scheduledAt date & time is required' });
    }

    const scopeFilter = req.dataScope || req.scopeFilter || {};
    const opportunity = await Opportunity.findOne({ _id: opportunityId, ...scopeFilter });

    if (!opportunity) {
      return res.status(404).json({ message: 'Opportunity not found' });
    }

    // NOTE: Denormalizing owner directly onto SiteVisit for fast query filtering without extra joins.
    // If an opportunity is reassigned later, historical SiteVisit.owner records will preserve creation owner unless explicitly synced.
    const siteVisit = await SiteVisit.create({
      opportunity: opportunity._id,
      scheduledBy: req.user._id,
      owner: opportunity.owner ? opportunity.owner : req.user._id,
      scheduledAt: new Date(scheduledAt),
      status: 'planned',
      feedback: { notes: notes || '' }
    });

    // Auto-advance opportunity stage to 'site_visit' if active
    if (opportunity.isActive && opportunity.stage !== 'won' && opportunity.stage !== 'lost') {
      opportunity.stage = 'site_visit';
      await opportunity.save();
    }

    res.status(201).json({
      success: true,
      message: 'Site visit scheduled successfully',
      siteVisit,
      opportunityStage: opportunity.stage
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all site visits for a specific opportunity
// @route   GET /api/opportunities/:id/site-visits
// @access  Private
const getSiteVisits = async (req, res, next) => {
  try {
    const opportunityId = req.params.id;
    const scopeFilter = req.dataScope || req.scopeFilter || {};

    const opportunity = await Opportunity.findOne({ _id: opportunityId, ...scopeFilter });
    if (!opportunity) {
      return res.status(404).json({ message: 'Opportunity not found' });
    }

    const siteVisits = await SiteVisit.find({ opportunity: opportunityId })
      .populate('scheduledBy', 'name email role')
      .sort({ scheduledAt: -1 });

    res.json({
      success: true,
      count: siteVisits.length,
      siteVisits
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update site visit status & feedback (mandatory feedback required on completion)
// @route   PATCH /api/site-visits/:id
// @access  Private
const updateSiteVisit = async (req, res, next) => {
  try {
    const { status, feedback, nextAction } = req.body;

    const siteVisit = await SiteVisit.findById(req.params.id);
    if (!siteVisit) {
      return res.status(404).json({ message: 'Site visit not found' });
    }

    const targetStatus = status || siteVisit.status;

    // MANDATORY COMPLETION FEEDBACK ENFORCEMENT (Section AE Compliance)
    if (targetStatus === 'completed') {
      const mergedFeedback = { ...(siteVisit.feedback?.toObject?.() || siteVisit.feedback || {}), ...(feedback || {}) };
      const mergedNextAction = nextAction !== undefined ? nextAction : siteVisit.nextAction;

      const errors = [];

      if (!mergedFeedback.response || !['liked', 'neutral', 'disliked'].includes(mergedFeedback.response)) {
        errors.push("feedback.response ('liked', 'neutral', 'disliked') is required when completing a site visit");
      }

      if (!mergedFeedback.interest || !['high', 'medium', 'low'].includes(mergedFeedback.interest)) {
        errors.push("feedback.interest ('high', 'medium', 'low') is required when completing a site visit");
      }

      if (!mergedNextAction || !mergedNextAction.trim()) {
        errors.push('nextAction text is required when completing a site visit (Section AE Compliance)');
      }

      if (errors.length > 0) {
        return res.status(400).json({
          message: 'Validation failed: A site visit cannot be marked completed without mandatory feedback and next action.',
          errors
        });
      }
    }

    // Apply updates
    if (status) siteVisit.status = status;
    if (nextAction !== undefined) siteVisit.nextAction = nextAction.trim();
    if (feedback) {
      siteVisit.feedback = {
        ...(siteVisit.feedback?.toObject?.() || siteVisit.feedback || {}),
        ...feedback
      };
    }

    await siteVisit.save();

    res.json({
      success: true,
      message: `Site visit updated (status: ${siteVisit.status})`,
      siteVisit
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's site visits (scoped by role/owner, filterable by ?status=planned|completed)
// @route   GET /api/site-visits/me
// @access  Private
const getMySiteVisits = async (req, res, next) => {
  try {
    const { status } = req.query;
    const scopeFilter = req.dataScope || req.scopeFilter || { owner: req.user._id };

    // Merge data scope (owner) with query status filter
    const filter = {
      $or: [
        { owner: req.user._id },
        { scheduledBy: req.user._id },
        scopeFilter
      ]
    };

    if (status) {
      filter.status = status;
    }

    const siteVisits = await SiteVisit.find(filter)
      .populate('scheduledBy', 'name email')
      .populate('owner', 'name email')
      .populate({
        path: 'opportunity',
        populate: [
          { path: 'customer', select: 'name primaryMobile email' },
          { path: 'project', select: 'name location' }
        ]
      })
      .sort({ scheduledAt: 1 }); // Sorted by scheduledAt ascending

    res.json({
      success: true,
      count: siteVisits.length,
      siteVisits
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  scheduleSiteVisit,
  getSiteVisits,
  updateSiteVisit,
  getMySiteVisits
};
