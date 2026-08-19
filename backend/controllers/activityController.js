const Activity = require('../models/Activity');
const Opportunity = require('../models/Opportunity');
const Followup = require('../models/Followup');
const { logActivitySchema } = require('../validators/activityValidators');

// @desc    Log a new contact activity for an opportunity (Immutable append-only)
// @route   POST /api/opportunities/:id/activities
// @access  Private
const logActivity = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Use validatedData if set by validate middleware, or parse req.body directly
    const data = req.validatedData || req.body;
    const parseResult = logActivitySchema.safeParse(data);
    if (!parseResult.success) {
      return res.status(400).json(parseResult.error.flatten());
    }

    const { channel, outcome, notes, stage, nextFollowup } = parseResult.data;

    const scopeFilter = req.dataScopeFilter ? { _id: id, ...req.dataScopeFilter } : { _id: id };
    const opportunity = await Opportunity.findOne(scopeFilter);
    if (!opportunity) {
      return res.status(404).json({ message: 'Opportunity not found' });
    }

    // 1. Create immutable Activity record
    const activity = await Activity.create({
      opportunity: opportunity._id,
      user: req.user._id,
      channel,
      outcome,
      notes: notes || ''
    });

    // 2. Update Opportunity lastContactedAt
    opportunity.lastContactedAt = new Date();

    // 3. Handle Stage and Active Status Changes
    const isClosing =
      outcome === 'not_interested' || stage === 'won' || stage === 'lost';

    if (isClosing) {
      opportunity.isActive = false;
      if (stage) {
        opportunity.stage = stage;
      } else if (outcome === 'not_interested') {
        opportunity.stage = 'lost';
      }
    } else if (stage) {
      opportunity.stage = stage;
    }

    await opportunity.save();

    // 4. Create Followup record if nextFollowup is provided
    let followup = null;
    if (nextFollowup && nextFollowup.dueAt && !isClosing) {
      followup = await Followup.create({
        opportunity: opportunity._id,
        owner: req.user._id,
        dueAt: new Date(nextFollowup.dueAt),
        purpose: nextFollowup.purpose || '',
        status: 'scheduled'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Activity logged successfully',
      activity,
      followup,
      opportunity
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get activity history for an opportunity (Newest first)
// @route   GET /api/opportunities/:id/activities
// @access  Private
const getActivities = async (req, res, next) => {
  try {
    const { id } = req.params;

    const scopeFilter = req.dataScopeFilter ? { _id: id, ...req.dataScopeFilter } : { _id: id };
    const opportunity = await Opportunity.findOne(scopeFilter);
    if (!opportunity) {
      return res.status(404).json({ message: 'Opportunity not found' });
    }

    const activities = await Activity.find({ opportunity: id })
      .sort({ createdAt: -1 })
      .populate('user', 'name email role');

    res.json({
      success: true,
      count: activities.length,
      activities
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  logActivity,
  getActivities
};
