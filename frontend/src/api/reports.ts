import api from './axios';

export async function getMyPerformance() {
  const response = await api.get('/reports/me');
  return response.data;
}
