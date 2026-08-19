import api from './axios.js';

export async function getOpportunities(params: Record<string, any> = {}) {
  const response = await api.get('/opportunities', { params });
  return response.data;
}

export async function getOpportunityById(id: string) {
  const response = await api.get(`/opportunities/${id}`);
  return response.data;
}

export async function submitLead(data: any) {
  const response = await api.post('/leads', data);
  return response.data;
}

export async function updateOpportunityStage(id: string, data: any) {
  const response = await api.patch(`/opportunities/${id}/stage`, data);
  return response.data;
}

export async function overrideDuplicateLead(data: { customerId: string; projectId: string; newOwnerId?: string; reason: string }) {
  const response = await api.post('/leads/override', data);
  return response.data;
}

export async function previewImportLeads(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/leads/import/preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
}

export async function confirmImportLeads(leads: any[]) {
  const response = await api.post('/leads/import/confirm', { leads });
  return response.data;
}

export async function exportLeads(params: Record<string, any> = {}) {
  const response = await api.get('/leads/export', {
    params,
    responseType: 'blob'
  });

  const blob = new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;

  const dateStr = new Date().toISOString().slice(0, 10);
  link.setAttribute('download', `OMVIK_Leads_Export_${dateStr}.xlsx`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);

  return true;
}
