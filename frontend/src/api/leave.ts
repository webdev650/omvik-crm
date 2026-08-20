import api from './axios';

export const requestLeave = async (data: {
  startDate: string;
  endDate: string;
  reason?: string;
  userId?: string;
  status?: string;
}) => {
  const res = await api.post('/leave', data);
  return res.data;
};

export const getLeaves = async () => {
  const res = await api.get('/leave');
  return res.data;
};

export const getActiveLeaves = async () => {
  const res = await api.get('/leave/active-now');
  return res.data;
};

export const decideLeave = async (id: string, status: 'approved' | 'rejected') => {
  const res = await api.patch(`/leave/${id}/decide`, { status });
  return res.data;
};
