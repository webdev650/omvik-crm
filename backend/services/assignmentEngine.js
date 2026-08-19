const User = require('../models/User');
const Team = require('../models/Team');
const Opportunity = require('../models/Opportunity');
const AssignmentHistory = require('../models/AssignmentHistory');

/**
 * Automatically assigns an opportunity to the active user with the lowest workload (least active opportunities).
 * Searches for team members linked to the project first, falling back to active sales users.
 *
 * @param {Object|String} opportunityOrId - Opportunity document or ID
 * @returns {Promise<Object>} Updated opportunity document
 */
async function autoAssign(opportunityOrId) {
  let opportunity =
    typeof opportunityOrId === 'string'
      ? await Opportunity.findById(opportunityOrId)
      : opportunityOrId;

  if (!opportunity) {
    throw new Error('Opportunity not found for auto-assignment');
  }

  // If opportunity already has an owner, return as is
  if (opportunity.owner) {
    return opportunity;
  }

  const projectId = opportunity.project;

  // 1. Find teams associated with this project
  const teams = await Team.find({ projectId: projectId });
  const teamIds = teams.map((t) => t._id);

  // 2. Find eligible active candidate users
  let candidates = await User.find({
    isActive: true,
    $or: [
      { teamId: { $in: teamIds } },
      { projectIds: projectId }
    ]
  });

  // Fallback: If no candidate users assigned directly to project/team, select active telecallers/team_leads
  if (candidates.length === 0) {
    candidates = await User.find({
      isActive: true,
      role: { $in: ['telecaller', 'team_lead'] }
    });
  }

  if (candidates.length === 0) {
    console.log('No active candidate users available for auto-assignment.');
    return opportunity;
  }

  // 3. Count current active workload for each candidate
  const candidatesWithWorkload = await Promise.all(
    candidates.map(async (user) => {
      const activeCount = await Opportunity.countDocuments({
        owner: user._id,
        isActive: true
      });
      return { user, activeCount };
    })
  );

  // 4. Sort ascending by activeCount (least busy user first)
  candidatesWithWorkload.sort((a, b) => a.activeCount - b.activeCount);

  const selectedUser = candidatesWithWorkload[0].user;

  // 5. Assign owner and record history
  opportunity.owner = selectedUser._id;
  await opportunity.save();

  await AssignmentHistory.create({
    opportunity: opportunity._id,
    assignedTo: selectedUser._id,
    assignedBy: null // System auto-assigned
  });

  return opportunity;
}

module.exports = {
  autoAssign
};
