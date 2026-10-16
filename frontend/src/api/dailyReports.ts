import api from './axios';
import { triggerAssistantRefresh } from './assistant';

export interface SubmitDailyReportPayload {
  claimedCalls: number;
  whatsappMessages: number;
  connectedCalls: number;
  claimedFollowups: number;
  claimedSiteVisits: number;
  bookingsToday: number;
  notes?: string;
}

export const submitDailyReport = async (data: SubmitDailyReportPayload) => {
  const res = await api.post('/daily-reports', data);
  triggerAssistantRefresh();
  return res.data;
};

export const getTodayReport = async () => {
  const res = await api.get('/daily-reports/today');
  return res.data;
};

export const getFlaggedReports = async (params?: {
  status?: string;
  fromDate?: string;
  toDate?: string;
  date?: string;
}) => {
  const res = await api.get('/daily-reports/flagged', { params: params || {} });
  return res.data;
};

export const resolveFlaggedReport = async (
  id: string,
  data: { status: 'open' | 'reviewed' | 'resolved'; resolutionNotes?: string }
) => {
  const res = await api.patch(`/daily-reports/${id}/resolve`, data);
  return res.data;
};

export const getTeamOverviewReport = async (date?: string) => {
  const res = await api.get('/daily-reports/team-overview', {
    params: date ? { date } : {}
  });
  return res.data;
};
