import api from './axios';

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
  return res.data;
};

export const getTodayReport = async () => {
  const res = await api.get('/daily-reports/today');
  return res.data;
};

export const getFlaggedReports = async () => {
  const res = await api.get('/daily-reports/flagged');
  return res.data;
};

export const getTeamOverviewReport = async (date?: string) => {
  const res = await api.get('/daily-reports/team-overview', {
    params: date ? { date } : {}
  });
  return res.data;
};
