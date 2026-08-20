import api from './axios';

export async function searchGlobal(query: string) {
  const response = await api.get(`/search?q=${encodeURIComponent(query)}`);
  return response.data;
}
