import api from './axios';

/**
 * Snoozes a visit reminder — creates a new reminder 10 minutes from now
 * and acknowledges the current notification so AlarmModal stops showing it.
 *
 * @param notificationId — the notification._id shown in AlarmModal
 */
export async function snoozeReminder(notificationId: string) {
  const response = await api.post('/visit-reminders/snooze', { notificationId });
  return response.data;
}
