import api from './axios';

/**
 * Fetch activity timeline for a specific opportunity (newest first)
 * @param {string} opportunityId
 */
export async function getActivities(opportunityId) {
  const response = await api.get(`/opportunities/${opportunityId}/activities`);
  return response.data;
}

/**
 * Log a new activity on an opportunity.
 * Enforces Next Action Rule: nextFollowup required unless outcome is
 * 'not_interested', or stage is 'won' / 'lost'.
 * @param {string} opportunityId
 * @param {Object} data - { channel, outcome, notes, stage?, nextFollowup? }
 */
export async function logActivity(opportunityId, data) {
  const response = await api.post(`/opportunities/${opportunityId}/activities`, data);
  return response.data;
}
