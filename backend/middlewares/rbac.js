const Team = require('../models/Team');
const User = require('../models/User');

// Restrict routes to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Forbidden: User role '${req.user.role}' is not authorized to perform this action`
      });
    }

    next();
  };
};

// Data Scoping Middleware for Row-Level / Data-Level Security
const applyDataScope = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const { role, _id: userId, teamId } = req.user;

    switch (role) {
      case 'super_admin':
      case 'director':
      case 'admin':
        // Full unrestricted database scope
        req.dataScope = {};
        break;

      case 'team_lead': {
        const teamIds = [];
        if (teamId) teamIds.push(teamId);

        const ledTeams = await Team.find({ teamLeadId: userId });
        ledTeams.forEach((t) => teamIds.push(t._id));

        const teamUsers = await User.find({
          $or: [
            { teamId: { $in: teamIds } },
            { _id: userId }
          ]
        }).select('_id');

        const memberIds = teamUsers.map((u) => u._id);

        console.log('[applyDataScope TL Debug]', { userId, teamId, ledTeamsCount: ledTeams.length, teamIds, memberIdsCount: memberIds.length });

        req.dataScope = {
          $or: [
            { owner: { $in: memberIds } },
            { assignedTo: { $in: memberIds } },
            { createdBy: { $in: memberIds } }
          ]
        };
        console.log('[applyDataScope TL Debug]', { userId, teamId, memberIds, scope: req.dataScope });
        break;
      }

      case 'telecaller':
        // Telecallers only see their own records.
        // `owner` is the Opportunity field; `assignedTo`/`createdBy` for other models
        req.dataScope = {
          $or: [{ owner: userId }, { assignedTo: userId }, { createdBy: userId }]
        };
        break;

      case 'marketing':
        req.dataScope = {
          $or: [{ owner: userId }, { assignedTo: userId }, { department: 'marketing' }]
        };
        break;

      case 'finance':
        req.dataScope = {
          $or: [{ owner: userId }, { assignedTo: userId }, { category: 'finance' }]
        };
        break;

      default:
        req.dataScope = { $or: [{ owner: userId }, { assignedTo: userId }] };
        break;
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authorize,
  applyDataScope
};
