const mongoose = require('mongoose');
const User = require('../models/User');
const Opportunity = require('../models/Opportunity');
const Activity = require('../models/Activity');
const Followup = require('../models/Followup');
const SiteVisit = require('../models/SiteVisit');
const DailyReport = require('../models/DailyReport');

/**
 * Calculate Date Boundaries for Asia/Kolkata (IST: UTC+5:30)
 */
function getKolkataDateBounds(range = 'this_month', customFrom, customTo) {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const todayStr = formatter.format(now); // "YYYY-MM-DD"
  const [yearStr, monthStr, dayStr] = todayStr.split('-');
  const currentYear = parseInt(yearStr, 10);
  const currentMonth = parseInt(monthStr, 10);
  const currentDay = parseInt(dayStr, 10);

  let fromStr = todayStr;
  let toStr = todayStr;

  switch (range) {
    case 'today':
      fromStr = todayStr;
      toStr = todayStr;
      break;

    case 'yesterday': {
      // 1 day before in IST
      const yDate = new Date(Date.UTC(currentYear, currentMonth - 1, currentDay - 1, 12, 0, 0));
      fromStr = formatter.format(yDate);
      toStr = fromStr;
      break;
    }

    case 'last_7_days': {
      // 6 days before to today
      const pastDate = new Date(Date.UTC(currentYear, currentMonth - 1, currentDay - 6, 12, 0, 0));
      fromStr = formatter.format(pastDate);
      toStr = todayStr;
      break;
    }

    case 'this_month': {
      fromStr = `${yearStr}-${monthStr}-01`;
      toStr = todayStr;
      break;
    }

    case 'last_month': {
      const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      const prevMonthStr = String(prevMonth).padStart(2, '0');
      const daysInPrevMonth = new Date(prevYear, prevMonth, 0).getDate();
      fromStr = `${prevYear}-${prevMonthStr}-01`;
      toStr = `${prevYear}-${prevMonthStr}-${String(daysInPrevMonth).padStart(2, '0')}`;
      break;
    }

    case 'custom': {
      fromStr = customFrom ? customFrom.split('T')[0] : todayStr;
      toStr = customTo ? customTo.split('T')[0] : todayStr;
      break;
    }

    default: {
      fromStr = `${yearStr}-${monthStr}-01`;
      toStr = todayStr;
      break;
    }
  }

  // Generate ISO dates respecting +05:30 offset
  const startDate = new Date(`${fromStr}T00:00:00.000+05:30`);
  const endDate = new Date(`${toStr}T23:59:59.999+05:30`);

  return { fromStr, toStr, startDate, endDate };
}

/**
 * Calculate working days (Mon-Sat, excluding Sundays) capped at today
 */
function countWorkingDays(fromStr, toStr) {
  let count = 0;
  const [sy, sm, sd] = fromStr.split('-').map(Number);
  const [ey, em, ed] = toStr.split('-').map(Number);
  let cur = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);

  const now = new Date();
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
  const [ty, tm, td] = f.format(now).split('-').map(Number);
  const todayDate = new Date(ty, tm - 1, td);

  const effectiveEnd = end < todayDate ? end : todayDate;

  while (cur <= effectiveEnd) {
    if (cur.getDay() !== 0) { // Exclude Sunday
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }

  return Math.max(1, count);
}

// @desc    Get Team Performance Summary & Employee Table
// @route   GET /api/performance/team
// @access  Private (admin, super_admin, director, team_lead)
const getTeamPerformance = async (req, res, next) => {
  try {
    const { range = 'this_month', from, to, projectId, teamId, search } = req.query;

    const { fromStr, toStr, startDate, endDate } = getKolkataDateBounds(range, from, to);
    const workingDays = countWorkingDays(fromStr, toStr);

    // Filter employees: Exclude admin, super_admin, director accounts
    const employeeFilter = {
      role: { $nin: ['admin', 'super_admin', 'director'] },
      isActive: { $ne: false }
    };

    // Team Lead scoping: only see their assigned team
    if (req.user.role === 'team_lead') {
      if (!req.user.teamId) {
        return res.json({
          success: true,
          range,
          from: fromStr,
          to: toStr,
          workingDays,
          totals: {
            totalLeads: 0,
            calls: 0,
            connectedCalls: 0,
            connectedRate: 0,
            followupsCompleted: 0,
            followupsOverdue: 0,
            siteVisits: 0,
            dealsWon: 0,
            conversionRate: 0
          },
          employees: []
        });
      }
      employeeFilter.teamId = req.user.teamId;
    } else if (teamId && teamId !== 'all') {
      employeeFilter.teamId = teamId;
    }

    if (search && search.trim()) {
      const q = search.trim();
      employeeFilter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { employeeId: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ];
    }

    const employees = await User.find(employeeFilter)
      .select('_id name email employeeId role teamId')
      .populate('teamId', 'name')
      .lean();

    if (employees.length === 0) {
      return res.json({
        success: true,
        range,
        from: fromStr,
        to: toStr,
        workingDays,
        totals: {
          totalLeads: 0,
          calls: 0,
          connectedCalls: 0,
          connectedRate: 0,
          followupsCompleted: 0,
          followupsOverdue: 0,
          siteVisits: 0,
          dealsWon: 0,
          conversionRate: 0
        },
        employees: []
      });
    }

    const employeeIds = employees.map(e => e._id);

    // Optional project-level scoping
    let projectOppIds = null;
    if (projectId && projectId !== 'all') {
      projectOppIds = await Opportunity.find({ project: projectId }).distinct('_id');
    }

    // Run parallel aggregation queries grouped by employee ID
    const [oppAgg, actAgg, fuAgg, svAgg, drAgg] = await Promise.all([
      // 1. Opportunities: Total Leads & Deals Won
      Opportunity.aggregate([
        {
          $match: {
            owner: { $in: employeeIds },
            ...(projectId && projectId !== 'all' ? { project: new mongoose.Types.ObjectId(projectId) } : {})
          }
        },
        {
          $group: {
            _id: '$owner',
            totalLeads: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gte: ['$createdAt', startDate] },
                      { $lte: ['$createdAt', endDate] }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            dealsWon: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$stage', 'won'] },
                      { $gte: ['$updatedAt', startDate] },
                      { $lte: ['$updatedAt', endDate] }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]),

      // 2. Activities: Total Calls & Connected Calls
      Activity.aggregate([
        {
          $match: {
            user: { $in: employeeIds },
            channel: 'call',
            createdAt: { $gte: startDate, $lte: endDate },
            ...(projectOppIds ? { opportunity: { $in: projectOppIds } } : {})
          }
        },
        {
          $group: {
            _id: '$user',
            calls: { $sum: 1 },
            connectedCalls: {
              $sum: {
                $cond: [
                  { $in: ['$outcome', ['connected', 'done']] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]),

      // 3. Followups: Completed & Overdue
      Followup.aggregate([
        {
          $match: {
            $or: [
              { owner: { $in: employeeIds } },
              { assignedTo: { $in: employeeIds } }
            ],
            ...(projectOppIds ? { opportunity: { $in: projectOppIds } } : {})
          }
        },
        {
          $group: {
            _id: { $ifNull: ['$owner', '$assignedTo'] },
            completed: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$status', 'completed'] },
                      {
                        $or: [
                          { $and: [{ $gte: ['$updatedAt', startDate] }, { $lte: ['$updatedAt', endDate] }] },
                          { $and: [{ $gte: ['$dueAt', startDate] }, { $lte: ['$dueAt', endDate] }] }
                        ]
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            overdue: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $in: ['$status', ['overdue', 'missed']] },
                      {
                        $or: [
                          { $and: [{ $gte: ['$dueAt', startDate] }, { $lte: ['$dueAt', endDate] }] },
                          { $and: [{ $gte: ['$createdAt', startDate] }, { $lte: ['$createdAt', endDate] }] },
                          { $and: [{ $gte: ['$updatedAt', startDate] }, { $lte: ['$updatedAt', endDate] }] }
                        ]
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]),

      // 4. Site Visits Driven
      SiteVisit.aggregate([
        {
          $match: {
            status: 'completed',
            $or: [
              { owner: { $in: employeeIds } },
              { scheduledBy: { $in: employeeIds } }
            ],
            $or: [
              { scheduledAt: { $gte: startDate, $lte: endDate } },
              { updatedAt: { $gte: startDate, $lte: endDate } },
              { completedAt: { $gte: startDate, $lte: endDate } }
            ],
            ...(projectOppIds ? { opportunity: { $in: projectOppIds } } : {})
          }
        },
        {
          $group: {
            _id: { $ifNull: ['$owner', '$scheduledBy'] },
            completed: { $sum: 1 }
          }
        }
      ]),

      // 5. Daily Reports: Days EOD Submitted
      DailyReport.aggregate([
        {
          $match: {
            user: { $in: employeeIds },
            date: { $gte: fromStr, $lte: toStr }
          }
        },
        {
          $group: {
            _id: '$user',
            submittedDays: { $sum: 1 }
          }
        }
      ])
    ]);

    // Map aggregated dictionaries by employee string ID
    const oppMap = Object.fromEntries(oppAgg.map(x => [x._id.toString(), x]));
    const actMap = Object.fromEntries(actAgg.map(x => [x._id.toString(), x]));
    const fuMap = Object.fromEntries(fuAgg.map(x => [x._id.toString(), x]));
    const svMap = Object.fromEntries(svAgg.map(x => [x._id.toString(), x]));
    const drMap = Object.fromEntries(drAgg.map(x => [x._id.toString(), x]));

    // Build complete employee rows with real records (0 fallback if no activity)
    const employeesList = employees.map(emp => {
      const idStr = emp._id.toString();
      const o = oppMap[idStr] || {};
      const a = actMap[idStr] || {};
      const f = fuMap[idStr] || {};
      const s = svMap[idStr] || {};
      const d = drMap[idStr] || {};

      const totalLeads = o.totalLeads || 0;
      const dealsWon = o.dealsWon || 0;
      const calls = a.calls || 0;
      const connectedCalls = a.connectedCalls || 0;
      const connectedRate = calls > 0 ? Math.round((connectedCalls / calls) * 100) : 0;
      const followupsCompleted = f.completed || 0;
      const followupsOverdue = f.overdue || 0;
      const siteVisits = s.completed || 0;
      const conversionRate = totalLeads > 0 ? Math.round((dealsWon / totalLeads) * 100) : (dealsWon > 0 ? 100 : 0);
      const eodDays = d.submittedDays || 0;
      const eodSubmitted = `${eodDays} / ${workingDays}`;

      const isZeroActivity = (calls === 0 && siteVisits === 0 && dealsWon === 0 && followupsCompleted === 0);
      const isHighOverdue = (followupsOverdue >= 5 || (followupsOverdue > 0 && followupsOverdue > followupsCompleted));

      return {
        userId: emp._id,
        name: emp.name,
        email: emp.email,
        employeeId: emp.employeeId || '—',
        role: emp.role,
        teamName: emp.teamId?.name || 'General',
        totalLeads,
        calls,
        connectedCalls,
        connectedRate,
        followupsCompleted,
        followupsOverdue,
        siteVisits,
        dealsWon,
        conversionRate,
        eodDays,
        workingDays,
        eodSubmitted,
        isZeroActivity,
        isHighOverdue
      };
    });

    // Default sorting: Deals Won (desc), Conversion Rate (desc), Calls (desc), Name (asc)
    employeesList.sort((a, b) => {
      if (b.dealsWon !== a.dealsWon) return b.dealsWon - a.dealsWon;
      if (b.conversionRate !== a.conversionRate) return b.conversionRate - a.conversionRate;
      if (b.calls !== a.calls) return b.calls - a.calls;
      return a.name.localeCompare(b.name);
    });

    // Assign ranking
    employeesList.forEach((emp, idx) => {
      emp.rank = idx + 1;
    });

    // Team Totals: guaranteed to equal the sum of employee rows
    const totals = {
      totalLeads: employeesList.reduce((acc, e) => acc + e.totalLeads, 0),
      calls: employeesList.reduce((acc, e) => acc + e.calls, 0),
      connectedCalls: employeesList.reduce((acc, e) => acc + e.connectedCalls, 0),
      followupsCompleted: employeesList.reduce((acc, e) => acc + e.followupsCompleted, 0),
      followupsOverdue: employeesList.reduce((acc, e) => acc + e.followupsOverdue, 0),
      siteVisits: employeesList.reduce((acc, e) => acc + e.siteVisits, 0),
      dealsWon: employeesList.reduce((acc, e) => acc + e.dealsWon, 0),
    };

    totals.conversionRate = totals.totalLeads > 0
      ? Math.round((totals.dealsWon / totals.totalLeads) * 100)
      : (totals.dealsWon > 0 ? 100 : 0);

    totals.connectedRate = totals.calls > 0
      ? Math.round((totals.connectedCalls / totals.calls) * 100)
      : 0;

    res.json({
      success: true,
      range,
      from: fromStr,
      to: toStr,
      workingDays,
      totals,
      employees: employeesList
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Single Employee Performance Details (Admin modal drilldown)
// @route   GET /api/performance/team/:userId
// @access  Private (admin, super_admin, director, team_lead)
const getEmployeeTeamDetail = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { range = 'this_month', from, to, projectId } = req.query;

    const targetUser = await User.findById(userId).populate('teamId', 'name').lean();
    if (!targetUser) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Prohibit viewing admins
    if (['admin', 'super_admin', 'director'].includes(targetUser.role)) {
      return res.status(400).json({
        message: 'Performance tracking is only available for telecalling and field staff'
      });
    }

    // Team lead check
    if (req.user.role === 'team_lead') {
      const viewerTeamId = req.user.teamId?.toString();
      const targetTeamId = targetUser.teamId?._id?.toString() || targetUser.teamId?.toString();
      if (!viewerTeamId || viewerTeamId !== targetTeamId) {
        return res.status(403).json({
          message: 'Forbidden: Team leads can only view performance for members of their own assigned team'
        });
      }
    }

    const { fromStr, toStr, startDate, endDate } = getKolkataDateBounds(range, from, to);
    const workingDays = countWorkingDays(fromStr, toStr);

    let projectOppIds = null;
    if (projectId && projectId !== 'all') {
      projectOppIds = await Opportunity.find({ project: projectId }).distinct('_id');
    }

    const targetId = targetUser._id;

    const [
      oppAgg,
      actAgg,
      followupsCompleted,
      followupsOverdue,
      siteVisitsCompleted,
      eodDays
    ] = await Promise.all([
      // Opportunities
      Opportunity.aggregate([
        {
          $match: {
            owner: targetId,
            ...(projectId && projectId !== 'all' ? { project: new mongoose.Types.ObjectId(projectId) } : {})
          }
        },
        {
          $group: {
            _id: null,
            totalLeads: {
              $sum: {
                $cond: [
                  { $and: [{ $gte: ['$createdAt', startDate] }, { $lte: ['$createdAt', endDate] }] },
                  1,
                  0
                ]
              }
            },
            dealsWon: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$stage', 'won'] },
                      { $gte: ['$updatedAt', startDate] },
                      { $lte: ['$updatedAt', endDate] }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]),

      // Activities
      Activity.aggregate([
        {
          $match: {
            user: targetId,
            channel: 'call',
            createdAt: { $gte: startDate, $lte: endDate },
            ...(projectOppIds ? { opportunity: { $in: projectOppIds } } : {})
          }
        },
        {
          $group: {
            _id: null,
            calls: { $sum: 1 },
            connectedCalls: {
              $sum: {
                $cond: [{ $in: ['$outcome', ['connected', 'done']] }, 1, 0]
              }
            }
          }
        }
      ]),

      // Followups Completed
      Followup.countDocuments({
        $or: [{ owner: targetId }, { assignedTo: targetId }],
        status: 'completed',
        $or: [
          { updatedAt: { $gte: startDate, $lte: endDate } },
          { dueAt: { $gte: startDate, $lte: endDate } }
        ],
        ...(projectOppIds ? { opportunity: { $in: projectOppIds } } : {})
      }),

      // Followups Overdue
      Followup.countDocuments({
        $or: [{ owner: targetId }, { assignedTo: targetId }],
        status: { $in: ['overdue', 'missed'] },
        $or: [
          { dueAt: { $gte: startDate, $lte: endDate } },
          { createdAt: { $gte: startDate, $lte: endDate } },
          { updatedAt: { $gte: startDate, $lte: endDate } }
        ],
        ...(projectOppIds ? { opportunity: { $in: projectOppIds } } : {})
      }),

      // Site visits
      SiteVisit.countDocuments({
        status: 'completed',
        $or: [{ owner: targetId }, { scheduledBy: targetId }],
        $or: [
          { scheduledAt: { $gte: startDate, $lte: endDate } },
          { updatedAt: { $gte: startDate, $lte: endDate } },
          { completedAt: { $gte: startDate, $lte: endDate } }
        ],
        ...(projectOppIds ? { opportunity: { $in: projectOppIds } } : {})
      }),

      // Daily Reports
      DailyReport.countDocuments({
        user: targetId,
        date: { $gte: fromStr, $lte: toStr }
      })
    ]);

    const totalLeads = oppAgg[0]?.totalLeads || 0;
    const dealsWon = oppAgg[0]?.dealsWon || 0;
    const calls = actAgg[0]?.calls || 0;
    const connectedCalls = actAgg[0]?.connectedCalls || 0;
    const connectedRate = calls > 0 ? Math.round((connectedCalls / calls) * 100) : 0;
    const winRate = totalLeads > 0 ? Math.round((dealsWon / totalLeads) * 100) : (dealsWon > 0 ? 100 : 0);

    res.json({
      success: true,
      range,
      from: fromStr,
      to: toStr,
      workingDays,
      employee: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        employeeId: targetUser.employeeId || '—',
        role: targetUser.role,
        teamName: targetUser.teamId?.name || 'General'
      },
      performance: {
        winRate,
        opportunitiesWon: dealsWon,
        leadsOwned: totalLeads,
        followupsCompleted,
        followupsOverdue,
        siteVisitsCompleted,
        calls,
        connectedCalls,
        connectedRate,
        eodDays,
        workingDays,
        eodSubmitted: `${eodDays} / ${workingDays}`
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTeamPerformance,
  getEmployeeTeamDetail
};
