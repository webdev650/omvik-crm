import api from './axios.js';

export async function getNotifications() {
  const response = await api.get('/notifications');
  return response.data;
}

export async function getUnreadCount() {
  const response = await api.get('/notifications/unread-count');
  return response.data;
}

export async function markAsRead(id: string) {
  const response = await api.patch(`/notifications/${id}/read`);
  return response.data;
}

export async function markAllAsRead() {
  const response = await api.patch('/notifications/read-all');
  return response.data;
}

/**
 * Fetches unacknowledged high-priority notifications for the AlarmModal.
 * Only returns visit_reminder notifications that haven't been dismissed.
 */
export async function getAlarmNotifications() {
  const response = await api.get('/notifications', {
    params: { priority: 'high', acknowledged: 'false' }
  });
  return response.data;
}

/**
 * Dismisses a notification — sets acknowledgedAt so AlarmModal won't show it again.
 */
export async function acknowledgeNotification(id: string) {
  const response = await api.patch(`/notifications/${id}/acknowledge`);
  return response.data;
}
