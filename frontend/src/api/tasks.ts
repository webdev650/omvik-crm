import api from './axios.js';

// Get all tasks (pending + completed) for the logged-in user
export async function getMyTasks() {
  const response = await api.get('/tasks/me');
  return response.data;
}

// Create a new task
export async function createTask(data: {
  title: string;
  dueDate?: string | null;
  relatedOpportunity?: string | null;
  owner?: string;
}) {
  const response = await api.post('/tasks', data);
  return response.data;
}

// Mark a task as completed
export async function completeTask(id: string) {
  const response = await api.patch(`/tasks/${id}/complete`);
  return response.data;
}
