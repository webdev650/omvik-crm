import api from './axios';

/**
 * Schedule a new site visit for a specific opportunity
 * @param {string} opportunityId
 * @param {Object} data - { scheduledAt, notes? }
 */
export async function scheduleSiteVisit(opportunityId, data) {
  const response = await api.post(`/opportunities/${opportunityId}/site-visits`, data);
  return response.data;
}

/**
 * Fetch site visits for a specific opportunity
 * @param {string} opportunityId
 */
export async function getSiteVisits(opportunityId) {
  const response = await api.get(`/opportunities/${opportunityId}/site-visits`);
  return response.data;
}

/**
 * Update site visit status and/or feedback.
 * Note: If status is 'completed', data MUST include feedback (response, interest) and nextAction.
 * @param {string} id - SiteVisit ID
 * @param {Object} data - { status?, feedback?, nextAction? }
 */
export async function updateSiteVisit(id, data) {
  const response = await api.patch(`/site-visits/${id}`, data);
  return response.data;
}

/**
 * Fetch user's site visits (filterable by ?status=planned|completed)
 * @param {Object} params - { status? }
 */
export async function getMySiteVisits(params = {}) {
  const response = await api.get('/site-visits/me', { params });
  return response.data;
}
