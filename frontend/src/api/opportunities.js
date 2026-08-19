import api from './axios';

/**
 * Fetch opportunities list with optional filter params (?stage=, ?project=)
 * @param {Object} params - Query parameters object
 */
export async function getOpportunities(params = {}) {
  const response = await api.get('/opportunities', { params });
  return response.data;
}

/**
 * Fetch a single opportunity by ID (scoped — 404 if caller can't access it)
 * @param {string} id - Opportunity document ID
 */
export async function getOpportunityById(id) {
  const response = await api.get(`/opportunities/${id}`);
  return response.data;
}

/**
 * Submit a new lead payload (creates Customer & Opportunity, or blocks duplicate)
 * @param {Object} data - Lead payload (rawName, rawMobile, project, source, campaign)
 */
export async function submitLead(data) {
  const response = await api.post('/leads', data);
  return response.data;
}

/**
 * Update stage of an opportunity (e.g. from Kanban drag)
 * @param {string} id - Opportunity ID
 * @param {Object} data - { stage, lostReason? }
 */
export async function updateOpportunityStage(id, data) {
  const response = await api.patch(`/opportunities/${id}/stage`, data);
  return response.data;
}

/**
 * Super Admin Duplicate Override API call
 * @param {Object} data - { customerId, projectId, newOwnerId?, reason }
 */
export async function overrideDuplicateLead(data) {
  const response = await api.post('/leads/override', data);
  return response.data;
}

/**
 * Bulk Lead Import Preview API call
 * @param {File} file - Excel or CSV file object
 */
export async function previewImportLeads(file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/leads/import/preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
}

/**
 * Bulk Lead Import Confirmation API call
 * @param {Array} leads - Array of validated lead objects
 */
export async function confirmImportLeads(leads) {
  const response = await api.post('/leads/import/confirm', { leads });
  return response.data;
}

/**
 * Export Leads to Excel (.xlsx) Blob file download
 * @param {Object} params - Filter parameters (?stage=, ?project=)
 */
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
