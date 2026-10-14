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

export async function updateOpportunityIntent(id: string, intent: 'high' | 'medium' | 'low') {
  const response = await api.patch(`/opportunities/${id}/intent`, { intent });
  return response.data;
}

export async function overrideDuplicateLead(data: { customerId: string; projectId: string; newOwnerId?: string; reason: string }) {
  const response = await api.post('/leads/override', data);
  return response.data;
}

export async function uploadAndAutoSaveImportLeads(
  file: File,
  batchName?: string,
  targetUserId?: string,
  projectId?: string,
  isPrivate?: boolean,
  accessLevel?: string
) {
  const formData = new FormData();
  formData.append('file', file);
  if (batchName) formData.append('batchName', batchName);
  if (targetUserId) formData.append('targetUserId', targetUserId);
  if (projectId) formData.append('projectId', projectId);
  if (isPrivate !== undefined) formData.append('isPrivate', String(isPrivate));
  if (accessLevel) formData.append('accessLevel', accessLevel);

  const response = await api.post('/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 180000 // 180000 ms safety net
  });
  return response.data;
}

export async function previewImportLeads(file: File, projectId?: string) {
  const formData = new FormData();
  formData.append('file', file);
  if (projectId) {
    formData.append('projectId', projectId);
  }
  const response = await api.post('/leads/import/preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
}

export async function confirmImportLeads(leads: any[], batchName?: string, targetUserId?: string, projectId?: string) {
  const response = await api.post('/leads/import/confirm', { leads, batchName, targetUserId, projectId });
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

export async function getProjectTeamStats(projectId: string) {
  const response = await api.get(`/opportunities/project-team-stats/${projectId}`);
  return response.data;
}

export interface LeadByDateItem {
  _id: string;
  leadCode: string;
  customerName: string;
  phone: string;
  email?: string;
  city?: string;
  project: string;
  projectCode?: string;
  intent: 'high' | 'medium' | 'low' | string;
  source: string;
  createdAt: string;
  assignedTo: string;
  assignedToUser?: any;
  createdBy?: string;
  currentStage: string;
  stage: string;
  importBatchId?: string | null;
}

export async function getLeadsByDate(date: string, params: Record<string, any> = {}): Promise<LeadByDateItem[]> {
  const response = await api.get('/leads/by-date', {
    params: { date, ...params }
  });
  return Array.isArray(response.data) ? response.data : (response.data?.leads || []);
}

export async function getLeadsDateSummary(month: string, year?: string | number, params: Record<string, any> = {}): Promise<Record<string, number>> {
  const response = await api.get('/leads/date-summary', {
    params: { month, year, ...params }
  });
  return response.data?.summary || response.data || {};
}

