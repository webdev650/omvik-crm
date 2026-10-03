const Opportunity = require('../models/Opportunity');
const Activity = require('../models/Activity');
const Followup = require('../models/Followup');
const SiteVisit = require('../models/SiteVisit');
const LoginLog = require('../models/LoginLog');
const Leave = require('../models/Leave');
const Task = require('../models/Task');

// @desc  Telecaller personal dashboard — all stats in one request
// @route GET /api/dashboard/employee-summary
// @access Private — telecaller-scoped (only their own data)
const getEmployeeSummary = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const now = new Date();

    // ── Today's date boundaries (local midnight to midnight) ──────────────────
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // ── Fetch all owned opportunity IDs first (shared lookup for joins) ────────
    const ownedOpps = await Opportunity.find({ owner: userId, isActive: true })
      .select('_id source slaBreached intent')
      .lean();
    const ownedOppIds = ownedOpps.map((o) => o._id);

    // ── Run all counts in parallel ─────────────────────────────────────────────
    const [
      // 1. Attendance
      todayLoginLog,

      // 3. Positive Leads (intent=high AND isActive=true)
      positiveLeads,

      // 4. Inactive/Negative Leads (intent=low OR isActive=false)
      negativeLeads,

      // 5. Follow-ups to be done (status=scheduled)
      followupsToBeDone,

      // 7. Site Visits Scheduled (planned + confirmed)
      siteVisitsScheduled,

      // 8. Site Visits Done (completed)
      siteVisitsDone,

      // 9a. Overdue followups
      overdueFollowups,

      // 10. Didn't Pick count (Activity outcome=didnt_pick on owned opps)
      didntPickCount,

      // 12. Pending tasks owned by this user
      pendingTaskCount,

      // 13. Leave — upcoming approved leave
      upcomingApprovedLeave,

      // 13. Leave — pending requests awaiting approval
      pendingLeaveCount,

    ] = await Promise.all([
      // 1. Login log for today
      LoginLog.findOne({
        user: userId,
        loginAt: { $gte: todayStart, $lte: todayEnd }
      })
        .sort({ loginAt: 1 }) // earliest login
        .select('loginAt')
        .lean(),

      // 3. Positive leads
      Opportunity.countDocuments({
        owner: userId,
        isActive: true,
        intent: 'high'
      }),

      // 4. Negative / inactive leads
      Opportunity.countDocuments({
        owner: userId,
        $or: [{ intent: 'low' }, { isActive: false }]
      }),

      // 5. Follow-ups to be done
      Followup.countDocuments({
        owner: userId,
        status: 'scheduled'
      }),

      // 7. Site visits scheduled — via the owned opportunities
      ownedOppIds.length > 0
        ? SiteVisit.countDocuments({
            opportunity: { $in: ownedOppIds },
            status: { $in: ['planned', 'confirmed'] }
          })
        : Promise.resolve(0),

      // 8. Site visits done
      ownedOppIds.length > 0
        ? SiteVisit.countDocuments({
            opportunity: { $in: ownedOppIds },
            status: 'completed'
          })
        : Promise.resolve(0),

      // 9a. Overdue followups (status=overdue)
      Followup.countDocuments({
        owner: userId,
        status: 'overdue'
      }),

      // 10. Didn't pick (outcome=didnt_pick on owned active opps)
      ownedOppIds.length > 0
        ? Activity.countDocuments({
            opportunity: { $in: ownedOppIds },
            outcome: 'didnt_pick'
          })
        : Promise.resolve(0),

      // 12. Pending tasks
      Task.countDocuments({ owner: userId, status: 'pending' }),

      // 13a. Upcoming approved leave
      Leave.findOne({
        user: userId,
        status: 'approved',
        endDate: { $gte: todayStart }
      })
        .sort({ startDate: 1 })
        .select('startDate endDate reason')
        .lean(),

      // 13b. Pending leave count
      Leave.countDocuments({ user: userId, status: 'pending' }),
    ]);

    // ── 6. Uncontacted leads (owned active opps with zero Activity records) ──
    // We need to cross-check Activity records — find oppIds that have at least one activity
    let uncontactedCount = 0;
    if (ownedOppIds.length > 0) {
      const contactedOppIds = await Activity.distinct('opportunity', {
        opportunity: { $in: ownedOppIds }
      });
      const contactedSet = new Set(contactedOppIds.map(String));
      uncontactedCount = ownedOppIds.filter((id) => !contactedSet.has(String(id))).length;
    }

    // ── 9b. slaBreached opportunities ─────────────────────────────────────────
    const slaBreachedCount = ownedOpps.filter((o) => o.slaBreached).length;

    // ── 9. Combined Overdue Action = overdue followups + sla-breached opps ─────
    const overdueAction = overdueFollowups + slaBreachedCount;

    // ── 11. Calls Received (active opps with source='call_received') ──────────
    const callsReceived = ownedOpps.filter(
      (o) => o.source && o.source.toUpperCase() === 'CALL_RECEIVED'
    ).length;

    // ── 1. Attendance shape ───────────────────────────────────────────────────
    const attendance = {
      checkedIn: !!todayLoginLog,
      loginTime: todayLoginLog ? todayLoginLog.loginAt : null
    };

    res.json({
      success: true,
      data: {
        attendance,
        myLeads: ownedOppIds.length,           // 2. Total active leads
        positiveLeads,                           // 3.
        negativeLeads,                           // 4.
        followupsToBeDone,                       // 5.
        uncontactedLeads: uncontactedCount,      // 6.
        siteVisitsScheduled,                     // 7.
        siteVisitsDone,                          // 8.
        overdueAction,                           // 9. combined
        overdueDetail: {
          overdueFollowups,
          slaBreachedOpps: slaBreachedCount
        },
        didntPick: didntPickCount,               // 10.
        callsReceived,                           // 11.
        pendingTasks: pendingTaskCount,           // 12.
        leave: {                                 // 13.
          upcomingApproved: upcomingApprovedLeave
            ? {
                startDate: upcomingApprovedLeave.startDate,
                endDate: upcomingApprovedLeave.endDate,
                reason: upcomingApprovedLeave.reason || ''
              }
            : null,
          pendingCount: pendingLeaveCount
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getEmployeeSummary };
