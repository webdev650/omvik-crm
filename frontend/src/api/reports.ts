import api from './axios';

export async function getMyPerformance() {
  const response = await api.get('/reports/me');
  return response.data;
}

export async function getEmployeeHistory(userId: string, from: string, to: string) {
  const response = await api.get(`/reports/employee-history/${userId}?from=${from}&to=${to}`);
  return response.data;
}

export interface ExecutiveKpiParams {
  period?: string;
  from?: string;
  to?: string;
}

export async function getExecutiveKpis(params?: ExecutiveKpiParams) {
  const response = await api.get('/reports/executive-kpis', { params });
  return response.data;
}
