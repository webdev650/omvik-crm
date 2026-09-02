import api from './axios.js';

export async function getDashboardSummary(params = {}) {
  const response = await api.get('/dashboard/summary', { params });
  return response.data;
}
