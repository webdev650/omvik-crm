import api from './axios.js';

export async function getProjects() {
  const response = await api.get('/projects');
  return response.data;
}

export async function getProjectById(id: string) {
  const response = await api.get(`/projects/${id}`);
  return response.data;
}

export async function createProject(data: {
  name: string;
  code: string;
  location?: string;
  builder?: string;
  propertyType?: string;
  status?: string;
  description?: string;
  managerId?: string;
}) {
  const response = await api.post('/projects', data);
  return response.data;
}

export async function updateProject(id: string, data: any) {
  const response = await api.patch(`/projects/${id}`, data);
  return response.data;
}
