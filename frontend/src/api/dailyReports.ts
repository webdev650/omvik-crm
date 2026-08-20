import api from './axios';

export const submitDailyReport = async (data: {
  claimedCalls: number;
  claimedFollowups: number;
  claimedSiteVisits: number;
  notes?: string;
}) => {
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
