import api from './axios.js';

export async function getDashboardSummary() {
  const response = await api.get('/dashboard/summary');
  return response.data;
}
