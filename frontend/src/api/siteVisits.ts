import api from './axios.js';

export async function scheduleSiteVisit(opportunityId: string, data: any) {
  const response = await api.post(`/opportunities/${opportunityId}/site-visits`, data);
  return response.data;
}

export async function getSiteVisits(opportunityId: string) {
  const response = await api.get(`/opportunities/${opportunityId}/site-visits`);
  return response.data;
}

export async function updateSiteVisit(id: string, data: any) {
  const response = await api.patch(`/site-visits/${id}`, data);
  return response.data;
}

export async function getMySiteVisits(params: Record<string, any> = {}) {
  const response = await api.get('/site-visits/me', { params });
  return response.data;
}
