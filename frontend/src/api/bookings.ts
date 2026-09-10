import api from './axios';

export interface BookingPayload {
  opportunityId?: string;
  customerId?: string;
  projectId?: string;
  contact?: string;
  location?: string;
  projectType?: string;
  unitNumber?: string;
  sqftArea?: number;
  bhk?: string | null;
  bookingDate?: string;
  finalPrice?: number;
  totalCost?: number;
  totalPaid?: number;
  probableRegistrationDate?: string | null;
  status?: string;
  currentStatus?: string;
  assignedTo?: string;
  remarks?: string;
  address?: string;
  city?: string;
}

export async function getBookingsByCustomer(customerId: string) {
  const response = await api.get(`/bookings/customer/${customerId}`);
  return response.data;
}

export async function getBookingByOpportunityId(opportunityId: string) {
  const response = await api.get(`/bookings/opportunity/${opportunityId}`);
  return response.data;
}

export async function createBooking(payload: BookingPayload) {
  const response = await api.post('/bookings', payload);
  return response.data;
}

export async function updateBooking(id: string, payload: BookingPayload) {
  const response = await api.patch(`/bookings/${id}`, payload);
  return response.data;
}
