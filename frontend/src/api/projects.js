import api from './axios.js';

export async function getProjects(params) {
  const response = await api.get('/projects', { params });
  return response.data;
}

export async function getProjectById(id) {
  const response = await api.get(`/projects/${id}`);
  return response.data;
}

export async function createProject(data) {
  const response = await api.post('/projects', data);
  return response.data;
}

export async function updateProject(id, data) {
  const response = await api.patch(`/projects/${id}`, data);
  return response.data;
}
