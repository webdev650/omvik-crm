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

const { getBatchScopingForUser, checkUserBatchAccess } = require('../utils/batchAccessHelper');

// Data Scoping Middleware for Row-Level / Data-Level Security
const applyDataScope = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const { role, _id: userId, teamId } = req.user;
    const isFullAdmin = ['super_admin', 'director', 'admin'].includes(role);

    // If a specific batchId or importBatchId is queried, verify access immediately
    const targetBatchId = req.query?.batchId || req.query?.importBatchId || req.params?.batchId;
    if (targetBatchId && !isFullAdmin) {
      const hasAccess = await checkUserBatchAccess(targetBatchId, req.user);
      if (!hasAccess) {
        return res.status(403).json({
          message: "You don't have access to this batch"
        });
      }
    }

    if (isFullAdmin) {
      // Full unrestricted database scope
      req.dataScope = {};
      req.dataScopeFilter = {};
      return next();
    }

    // Retrieve batch access scoping for non-admin user
    const { forbiddenBatchIds, accessibleBatchIds } = await getBatchScopingForUser(req.user);

    switch (role) {
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

        const orConditions = [
          { owner: { $in: memberIds } },
          { assignedTo: { $in: memberIds } },
          { createdBy: { $in: memberIds } },
          { createdBy: userId }
        ];

        if (accessibleBatchIds.length > 0) {
          orConditions.push({ importBatchId: { $in: accessibleBatchIds } });
        }

        if (forbiddenBatchIds.length > 0) {
          orConditions.push({
            owner: null,
            importBatchId: { $nin: forbiddenBatchIds }
          });
          req.dataScope = {
            $and: [
              { $or: orConditions },
              { importBatchId: { $nin: forbiddenBatchIds } }
            ]
          };
        } else {
          orConditions.push({ owner: null });
          req.dataScope = { $or: orConditions };
        }
        break;
      }

      case 'telecaller': {
        // Telecallers see their owned records, records created by them, accessible shared batches, or unassigned records
        const orConditions = [
          { owner: userId },
          { assignedTo: userId },
          { createdBy: userId }
        ];

        if (accessibleBatchIds.length > 0) {
          orConditions.push({ importBatchId: { $in: accessibleBatchIds } });
        }

        if (forbiddenBatchIds.length > 0) {
          orConditions.push({
            owner: null,
            importBatchId: { $nin: forbiddenBatchIds }
          });
          req.dataScope = {
            $and: [
              { $or: orConditions },
              { importBatchId: { $nin: forbiddenBatchIds } }
            ]
          };
        } else {
          orConditions.push({ owner: null });
          req.dataScope = { $or: orConditions };
        }
        break;
      }

      case 'marketing': {
        const orConditions = [
          { owner: userId },
          { assignedTo: userId },
          { createdBy: userId },
          { department: 'marketing' }
        ];
        if (accessibleBatchIds.length > 0) {
          orConditions.push({ importBatchId: { $in: accessibleBatchIds } });
        }
        if (forbiddenBatchIds.length > 0) {
          orConditions.push({
            owner: null,
            importBatchId: { $nin: forbiddenBatchIds }
          });
          req.dataScope = {
            $and: [
              { $or: orConditions },
              { importBatchId: { $nin: forbiddenBatchIds } }
            ]
          };
        } else {
          orConditions.push({ owner: null });
          req.dataScope = { $or: orConditions };
        }
        break;
      }

      case 'finance': {
        const orConditions = [
          { owner: userId },
          { assignedTo: userId },
          { createdBy: userId },
          { category: 'finance' }
        ];
        if (accessibleBatchIds.length > 0) {
          orConditions.push({ importBatchId: { $in: accessibleBatchIds } });
        }
        if (forbiddenBatchIds.length > 0) {
          orConditions.push({
            owner: null,
            importBatchId: { $nin: forbiddenBatchIds }
          });
          req.dataScope = {
            $and: [
              { $or: orConditions },
              { importBatchId: { $nin: forbiddenBatchIds } }
            ]
          };
        } else {
          orConditions.push({ owner: null });
          req.dataScope = { $or: orConditions };
        }
        break;
      }

      default: {
        const orConditions = [
          { owner: userId },
          { assignedTo: userId },
          { createdBy: userId }
        ];
        if (accessibleBatchIds.length > 0) {
          orConditions.push({ importBatchId: { $in: accessibleBatchIds } });
        }
        if (forbiddenBatchIds.length > 0) {
          orConditions.push({
            owner: null,
            importBatchId: { $nin: forbiddenBatchIds }
          });
          req.dataScope = {
            $and: [
              { $or: orConditions },
              { importBatchId: { $nin: forbiddenBatchIds } }
            ]
          };
        } else {
          orConditions.push({ owner: null });
          req.dataScope = { $or: orConditions };
        }
        break;
      }
    }

    req.dataScopeFilter = req.dataScope;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authorize,
  applyDataScope
};
