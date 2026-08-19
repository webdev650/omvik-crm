import api from './axios';

/**
 * Fetch the current user's follow-ups, optionally filtered by status.
 * @param {'pending'|'overdue'|'completed'|undefined} status
 */
export async function getMyFollowups(status) {
  const params = status ? { status } : {};
  const response = await api.get('/followups/me', { params });
  return response.data;
}

/**
 * Mark a follow-up as completed.
 * @param {string} id - Followup document ID
 */
export async function completeFollowup(id) {
  const response = await api.patch(`/followups/${id}/complete`);
  return response.data;
}
