import api from './axios.js';

export async function getTeams() {
  const response = await api.get('/teams');
  return response.data;
}

export async function getTeamById(id: string) {
  const response = await api.get(`/teams/${id}`);
  return response.data;
}

export async function createTeam(data: {
  name: string;
  description?: string;
  teamLeadId?: string;
  memberIds?: string[];
  projectId?: string;
}) {
  const response = await api.post('/teams', data);
  return response.data;
}

export async function updateTeam(id: string, data: any) {
  const response = await api.patch(`/teams/${id}`, data);
  return response.data;
}

export async function addMemberToTeam(teamId: string, userId: string) {
  const response = await api.post(`/teams/${teamId}/members`, { userId });
  return response.data;
}
