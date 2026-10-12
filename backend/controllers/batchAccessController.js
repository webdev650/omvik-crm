const mongoose = require('mongoose');
const BatchAccess = require('../models/BatchAccess');
const ImportBatch = require('../models/ImportBatch');
const Opportunity = require('../models/Opportunity');
const User = require('../models/User');
const Project = require('../models/Project');

/**
 * @desc    Grant or update batch access for employee(s)
 * @route   POST /api/batch-access
 * @access  Private (super_admin, admin, director)
 */
const createBatchAccess = async (req, res, next) => {
  try {
    const { batchId, assignedTo, accessLevel = 'view', expiresAt } = req.body;

    if (!batchId) {
      return res.status(400).json({ message: 'batchId is required' });
    }

    if (!assignedTo || (Array.isArray(assignedTo) && assignedTo.length === 0)) {
      return res.status(400).json({ message: 'assignedTo employee ID or array is required' });
    }

    const assignedUserIds = Array.isArray(assignedTo) ? assignedTo : [assignedTo];

    // Validate employee IDs
    const validUsers = await User.find({ _id: { $in: assignedUserIds } });
    if (validUsers.length === 0) {
      return res.status(404).json({ message: 'No valid user found for provided assignedTo IDs' });
    }

    // Ensure ImportBatch document exists
    let importBatch = await ImportBatch.findOne({ batchId });
    if (!importBatch) {
      const oppSample = await Opportunity.findOne({ importBatchId: batchId });
      const totalRows = await Opportunity.countDocuments({ importBatchId: batchId });
      importBatch = await ImportBatch.create({
        batchId,
        batchName: batchId,
        project: oppSample?.project || null,
        uploadedBy: req.user._id,
        totalRows,
        importedCount: totalRows,
        isPrivate: true
      });
    } else {
      importBatch.isPrivate = true;
      await importBatch.save();
    }

    // Create or update BatchAccess document
    const access = await BatchAccess.findOneAndUpdate(
      { batchId },
      {
        batch: importBatch._id,
        batchId,
        assignedTo: assignedUserIds,
        accessLevel,
        grantedBy: req.user._id,
        grantedAt: new Date(),
        expiresAt: expiresAt || null
      },
      { upsert: true, new: true }
    )
      .populate('assignedTo', 'name email employeeId role')
      .populate('grantedBy', 'name email');

    res.status(201).json({
      success: true,
      message: `Batch access granted to ${validUsers.map((u) => u.name).join(', ')}`,
      access
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get batches accessible to the logged-in user
 * @route   GET /api/my-accessible-batches
 * @access  Private (All authenticated users)
 */
const getMyAccessibleBatches = async (req, res, next) => {
  try {
    const isFullAdmin = ['super_admin', 'admin', 'director'].includes(req.user.role);

    if (isFullAdmin) {
      // Admins see all batches with access metadata
      const [allAccess, batchAgg] = await Promise.all([
        BatchAccess.find({})
          .populate('assignedTo', 'name email employeeId role')
          .populate('grantedBy', 'name email')
          .lean(),
        Opportunity.aggregate([
          {
            $group: {
              _id: { $ifNull: ['$importBatchId', 'MANUAL / WEBSITE'] },
              leadCount: { $sum: 1 },
              lastImportedAt: { $max: '$createdAt' },
              projectIds: { $addToSet: '$project' }
            }
          },
          { $sort: { lastImportedAt: -1 } }
        ])
      ]);

      const accessMap = new Map(allAccess.map((a) => [a.batchId, a]));

      const batches = await Promise.all(
        batchAgg.map(async (b) => {
          const access = accessMap.get(b._id);
          const project = b.projectIds?.[0] ? await Project.findById(b.projectIds[0]).select('name code') : null;

          return {
            batchId: b._id,
            batchName: b._id,
            leadCount: b.leadCount,
            lastImportedAt: b.lastImportedAt,
            project: project ? { _id: project._id, name: project.name, code: project.code } : null,
            isPrivate: !!access,
            accessLevel: access ? access.accessLevel : 'manage',
            assignedTo: access?.assignedTo || [],
            grantedBy: access?.grantedBy || null,
            grantedAt: access?.grantedAt || b.lastImportedAt
          };
        })
      );

      return res.json({
        success: true,
        count: batches.length,
        batches
      });
    }

    // For employees (telecaller, field_executive, etc.):
    const userId = req.user._id;

    // 1. Find batches explicitly assigned via BatchAccess
    const accessRecords = await BatchAccess.find({ assignedTo: userId })
      .populate('assignedTo', 'name email employeeId role')
      .populate('grantedBy', 'name email')
      .lean();

    const accessibleBatchIds = accessRecords.map((a) => a.batchId);
    const accessMap = new Map(accessRecords.map((a) => [a.batchId, a]));

    // 2. Also find batches that belong to this employee's owned leads (excluding batches private to others)
    const forbiddenGrants = await BatchAccess.find({ assignedTo: { $ne: userId } }).select('batchId');
    const forbiddenBatchIds = new Set(forbiddenGrants.map((g) => g.batchId));

    const employeeBatchesAgg = await Opportunity.aggregate([
      {
        $match: {
          $or: [
            { owner: userId },
            { importBatchId: { $in: accessibleBatchIds } }
          ],
          ...(forbiddenBatchIds.size > 0
            ? { importBatchId: { $nin: Array.from(forbiddenBatchIds) } }
            : {})
        }
      },
      {
        $group: {
          _id: '$importBatchId',
          leadCount: { $sum: 1 },
          lastImportedAt: { $max: '$createdAt' },
          projectIds: { $addToSet: '$project' }
        }
      },
      { $sort: { lastImportedAt: -1 } }
    ]);

    const batches = await Promise.all(
      employeeBatchesAgg
        .filter((b) => b._id && !forbiddenBatchIds.has(b._id))
        .map(async (b) => {
          const access = accessMap.get(b._id);
          const project = b.projectIds?.[0] ? await Project.findById(b.projectIds[0]).select('name code') : null;

          return {
            batchId: b._id,
            batchName: b._id,
            leadCount: b.leadCount,
            lastImportedAt: b.lastImportedAt,
            project: project ? { _id: project._id, name: project.name, code: project.code } : null,
            isPrivate: !!access,
            accessLevel: access ? access.accessLevel : 'view',
            assignedTo: access?.assignedTo || [{ _id: req.user._id, name: req.user.name }],
            grantedBy: access?.grantedBy || null,
            grantedAt: access?.grantedAt || b.lastImportedAt
          };
        })
    );

    return res.json({
      success: true,
      count: batches.length,
      batches
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Revoke batch access record
 * @route   DELETE /api/batch-access/:id
 * @access  Private (super_admin, admin, director)
 */
const revokeBatchAccess = async (req, res, next) => {
  try {
    const { id } = req.params;

    const queryConditions = [{ batchId: id }];
    if (mongoose.Types.ObjectId.isValid(id)) {
      queryConditions.push({ _id: new mongoose.Types.ObjectId(id) });
    }

    const deleted = await BatchAccess.findOneAndDelete({ $or: queryConditions });

    if (!deleted) {
      return res.status(404).json({ message: 'Batch access record not found' });
    }

    // Update ImportBatch isPrivate flag if no further access records
    const remaining = await BatchAccess.findOne({ batchId: deleted.batchId });
    if (!remaining) {
      await ImportBatch.findOneAndUpdate({ batchId: deleted.batchId }, { isPrivate: false });
    }

    res.json({
      success: true,
      message: `Batch access revoked successfully for batch "${deleted.batchId}"`,
      revokedBatchId: deleted.batchId
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all batch access entries (admin oversight)
 * @route   GET /api/batch-access
 * @access  Private (super_admin, admin, director)
 */
const getAllBatchAccess = async (req, res, next) => {
  try {
    const accessList = await BatchAccess.find({})
      .populate('assignedTo', 'name email employeeId role')
      .populate('grantedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: accessList.length,
      accessList
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBatchAccess,
  getMyAccessibleBatches,
  revokeBatchAccess,
  getAllBatchAccess
};
