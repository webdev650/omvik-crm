import api from './axios';

export async function getMyFollowups(status?: string) {
  const params = status ? { status } : {};
  const response = await api.get('/followups/me', { params });
  return response.data;
}

export async function completeFollowup(id: string) {
  const response = await api.patch(`/followups/${id}/complete`);
  return response.data;
}
