import api from './axios.js';

export async function getUsers() {
  const response = await api.get('/users');
  return response.data;
}

export async function getUserById(id: string) {
  const response = await api.get(`/users/${id}`);
  return response.data;
}

export async function createUser(data: {
  name: string;
  email: string;
  password?: string;
  role?: string;
  teamId?: string;
}) {
  const response = await api.post('/users', data);
  return response.data;
}

export async function updateUser(
  id: string,
  data: {
    name?: string;
    email?: string;
    role?: string;
    teamId?: string;
    isActive?: boolean;
    password?: string;
  }
) {
  const response = await api.patch(`/users/${id}`, data);
  return response.data;
}

export async function updateOwnProfile(data: { name?: string; phone?: string }) {
  const response = await api.patch('/users/me', data);
  return response.data;
}
