const mongoose = require('mongoose');
const BatchAccess = require('../models/BatchAccess');
const ImportBatch = require('../models/ImportBatch');

/**
 * Check if a given user has access to a specific batch
 * @param {string|mongoose.Types.ObjectId} batchId
 * @param {Object} user
 * @returns {Promise<boolean>}
 */
async function checkUserBatchAccess(batchId, user) {
  if (!user) return false;

  // 1. Full admin roles have universal access
  if (['super_admin', 'admin', 'director'].includes(user.role)) {
    return true;
  }

  if (!batchId || batchId === 'MANUAL / WEBSITE' || batchId === 'manual') {
    return true;
  }

  const queryConditions = [{ batchId: String(batchId) }];
  if (mongoose.Types.ObjectId.isValid(batchId)) {
    queryConditions.push({ batch: new mongoose.Types.ObjectId(batchId) });
  }

  // 2. Query BatchAccess for this batch
  const access = await BatchAccess.findOne({ $or: queryConditions });

  if (access) {
    const userIdStr = user._id ? user._id.toString() : String(user);
    const hasAccess = access.assignedTo.some(
      (id) => (id._id ? id._id.toString() : id.toString()) === userIdStr
    );
    return hasAccess;
  }

  // 3. Fallback: check if ImportBatch document exists and is marked private
  const batchDoc = await ImportBatch.findOne({
    $or: [
      { batchId: String(batchId) },
      ...(mongoose.Types.ObjectId.isValid(batchId) ? [{ _id: new mongoose.Types.ObjectId(batchId) }] : [])
    ]
  });

  if (batchDoc && batchDoc.isPrivate) {
    // Private batch with no access grant for this employee
    return false;
  }

  // Otherwise, non-private batch
  return true;
}

/**
 * Get lists of accessible and forbidden batch IDs for an employee
 * @param {Object} user
 * @returns {Promise<{ forbiddenBatchIds: string[], accessibleBatchIds: string[] }>}
 */
async function getBatchScopingForUser(user) {
  if (!user || ['super_admin', 'admin', 'director'].includes(user.role)) {
    return { forbiddenBatchIds: [], accessibleBatchIds: [] };
  }

  const userId = user._id;

  // Batches explicitly assigned to this user
  const accessibleGrants = await BatchAccess.find({
    assignedTo: userId
  }).select('batchId');
  const accessibleBatchIds = accessibleGrants.map((g) => g.batchId).filter(Boolean);

  // Batches restricted to other employees (where user is NOT in assignedTo)
  const forbiddenGrants = await BatchAccess.find({
    assignedTo: { $ne: userId }
  }).select('batchId');
  const forbiddenBatchIds = forbiddenGrants.map((g) => g.batchId).filter(Boolean);

  return { forbiddenBatchIds, accessibleBatchIds };
}

module.exports = {
  checkUserBatchAccess,
  getBatchScopingForUser
};
