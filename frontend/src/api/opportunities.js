import api from './axios.js';

export async function getOpportunities(params = {}) {
  const response = await api.get('/opportunities', { params });
  return response.data;
}

export async function getOpportunityById(id) {
  const response = await api.get(`/opportunities/${id}`);
  return response.data;
}

export async function submitLead(data) {
  const response = await api.post('/leads', data);
  return response.data;
}

export async function updateOpportunityStage(id, data) {
  const response = await api.patch(`/opportunities/${id}/stage`, data);
  return response.data;
}

export async function updateOpportunityIntent(id, intent) {
  const response = await api.patch(`/opportunities/${id}/intent`, { intent });
  return response.data;
}

export async function overrideDuplicateLead(data) {
  const response = await api.post('/leads/override', data);
  return response.data;
}

export async function uploadAndAutoSaveImportLeads(file, batchName, targetUserId, projectId) {
  const formData = new FormData();
  formData.append('file', file);
  if (batchName) formData.append('batchName', batchName);
  if (targetUserId) formData.append('targetUserId', targetUserId);
  if (projectId) formData.append('projectId', projectId);

  const response = await api.post('/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
}

export async function previewImportLeads(file, projectId) {
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

export async function confirmImportLeads(leads, batchName, targetUserId, projectId) {
  const response = await api.post('/leads/import/confirm', { leads, batchName, targetUserId, projectId });
  return response.data;
}

export async function exportLeads(params = {}) {
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

export async function getProjectTeamStats(projectId) {
  const response = await api.get('/opportunities/project-team-stats', {
    params: { project: projectId }
  });
  return response.data;
}
