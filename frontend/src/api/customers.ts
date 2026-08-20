import api from './axios';

export async function getCustomers() {
  const response = await api.get('/customers');
  return response.data;
}

export async function getCustomerById(id: string) {
  const response = await api.get(`/customers/${id}`);
  return response.data;
}
