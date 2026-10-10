import api from './axios.js';

export async function getImportHistory(params: Record<string, any> = {}) {
  const response = await api.get('/import-history', { params });
  return response.data;
}

export async function getBatchLeadsDetail(batchId: string) {
  const response = await api.get(`/import-history/${encodeURIComponent(batchId)}/leads`);
  return response.data;
}

export async function getBatchReassignOptions(batchId: string) {
  const response = await api.get(`/import-history/${encodeURIComponent(batchId)}/reassign-options`);
  return response.data;
}

export async function reassignBatchLeads(batchId: string, data: { selectedLeadIds?: string[] | null; newOwner: string; reason?: string }) {
  const response = await api.post(`/import-history/${encodeURIComponent(batchId)}/reassign`, data);
  return response.data;
}

export async function getEmployeeWorkHistory(empId: string, params: Record<string, any> = {}) {
  const response = await api.get(`/employees/${encodeURIComponent(empId)}/work-history`, { params });
  return response.data;
}

export async function getEmployeeBatchSummary(empId: string, batchId: string) {
  const response = await api.get(`/employees/${encodeURIComponent(empId)}/batch-summary/${encodeURIComponent(batchId)}`);
  return response.data;
}
