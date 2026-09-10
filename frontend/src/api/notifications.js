import api from './axios';

/**
 * Fetch notifications list for logged in user
 */
export async function getNotifications() {
  const response = await api.get('/notifications');
  return response.data;
}

/**
 * Fetch lightweight unread count for badge indicator
 */
export async function getUnreadCount() {
  const response = await api.get('/notifications/unread-count');
  return response.data;
}

/**
 * Mark single notification as read
 * @param {string} id - Notification document ID
 */
export async function markAsRead(id) {
  const response = await api.patch(`/notifications/${id}/read`);
  return response.data;
}

/**
 * Mark all unread notifications as read
 */
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
 * @param {string} id - Notification document ID
 */
export async function acknowledgeNotification(id) {
  const response = await api.patch(`/notifications/${id}/acknowledge`);
  return response.data;
}
