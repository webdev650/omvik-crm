const SiteVisit = require('../models/SiteVisit');
const VisitReminder = require('../models/VisitReminder');
const Opportunity = require('../models/Opportunity');

/**
 * Compute the 3 reminder fire-times for a given site visit scheduledAt.
 *
 * PRODUCTION offsets:
 *   day_before    = scheduledAt - 24 hours
 *   morning_of    = 08:00 AM on the same calendar day as scheduledAt (local time)
 *   final_reminder = scheduledAt - 1 hour
 *
 * TEST mode (TEST_REMINDER_OFFSETS=true in .env):
 *   day_before    = scheduledAt - 30 seconds  (for testing)
 *   morning_of    = scheduledAt - 60 seconds  (for testing)
 *   final_reminder = scheduledAt - 120 seconds (for testing)
 */
function computeReminderTimes(scheduledAt) {
  const t = new Date(scheduledAt).getTime();
  const isTest = process.env.TEST_REMINDER_OFFSETS === 'true';

  if (isTest) {
    return {
      day_before:     new Date(t - 30 * 1000),          // 30s before
      morning_of:     new Date(t - 60 * 1000),          // 60s before
      final_reminder: new Date(t - 120 * 1000)          // 2min before
    };
  }

  // Production: morning_of = 08:00 AM on the day of the visit
  const visitDay = new Date(scheduledAt);
  const morningOf = new Date(visitDay);
  morningOf.setHours(8, 0, 0, 0);

  return {
    day_before:     new Date(t - 24 * 60 * 60 * 1000), // 24h before
    morning_of:     morningOf,                          // 8:00 AM day-of
    final_reminder: new Date(t - 60 * 60 * 1000)       // 1h before
  };
}

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
    const siteVisit = await SiteVisit.create({
      opportunity: opportunity._id,
      scheduledBy: req.user._id,
      owner: opportunity.owner ? opportunity.owner : req.user._id,
      scheduledAt: new Date(scheduledAt),
      status: 'planned',
      feedback: { notes: notes || '' }
    });

    // Auto-generate 3 alarm reminders for this site visit
    const reminderTimes = computeReminderTimes(siteVisit.scheduledAt);
    await VisitReminder.insertMany([
      { siteVisit: siteVisit._id, type: 'day_before',     scheduledFor: reminderTimes.day_before     },
      { siteVisit: siteVisit._id, type: 'morning_of',     scheduledFor: reminderTimes.morning_of     },
      { siteVisit: siteVisit._id, type: 'final_reminder', scheduledFor: reminderTimes.final_reminder }
    ]);

    console.log(`[VisitReminders] Auto-generated 3 reminders for SiteVisit ${siteVisit._id} (TEST_MODE=${process.env.TEST_REMINDER_OFFSETS === 'true'})`);

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
