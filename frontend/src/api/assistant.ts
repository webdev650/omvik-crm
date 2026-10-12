import api from './axios';

export interface AssistantCounts {
  overdueFollowups: number;
  followupsDueToday: number;
  pendingTasks: number;
  pendingSiteVisits: number;
  isEodSubmitted: boolean;
}

export interface AssistantMessageResponse {
  type: 'reminder' | 'appreciation' | 'info' | 'greeting';
  message: string;
  counts: AssistantCounts | null;
}

/**
 * Fetch role-based, task-aware Omvik Assistant message
 */
export async function getAssistantMessage(): Promise<AssistantMessageResponse> {
  const response = await api.get('/assistant/message');
  return response.data;
}

/**
 * Trigger global assistant refresh event (used after logging a call, completing a task, or submitting EOD)
 */
export function triggerAssistantRefresh() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('omvik_refresh_assistant'));
  }
}
