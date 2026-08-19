import api from './axios';

/**
 * Fetch dashboard summary stats (funnel, project breakdown, source breakdown, SLA breaches, overdue followups)
 */
export async function getDashboardSummary() {
  const response = await api.get('/dashboard/summary');
  return response.data;
}
