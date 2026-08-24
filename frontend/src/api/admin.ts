import api from './axios';

export async function getDataQualityMetrics() {
  const response = await api.get('/admin/data-quality');
  return response.data;
}

export async function getDuplicateMonitorMetrics() {
  const response = await api.get('/admin/duplicate-monitor');
  return response.data;
}

export async function getLoginActivity(params?: { userId?: string; from?: string; to?: string }) {
  const response = await api.get('/admin/login-activity', { params });
  return response.data;
}
