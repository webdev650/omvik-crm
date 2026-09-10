/**
 * AlarmModal — Site Visit Alarm-Style Reminder
 *
 * Polls every 60 seconds for high-priority unacknowledged visit_reminder notifications.
 * When one is found, renders a FULL-SCREEN non-dismissible overlay modal (like a phone alarm).
 * Supports:
 *   - "Snooze 10 min" — creates a new reminder 10 minutes from now, acknowledges current
 *   - "Dismiss" — acknowledges the notification, modal closes
 *
 * BROWSER LIMITATION (disclosed honestly):
 * This modal only appears while the CRM tab is open in the browser.
 * It CANNOT alert a user who has closed the tab, minimized the browser, or locked their device.
 * This is a fundamental constraint of web applications — JavaScript cannot run in a closed tab.
 * A true phone-alarm equivalent would require a native app or Web Push Notifications
 * with a service worker background process — significantly more infrastructure.
 * For a CRM used during active working hours with the tab kept open, this approach is
 * reliable and effective within its stated constraints.
 *
 * Sound: Uses Web Audio API (no external file) — generates a short double-beep programmatically.
 * Plays only after the user has interacted with the page at least once (click/keypress)
 * to satisfy browser autoplay restrictions. Silent on first load before any interaction.
 */

import React, { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Clock, X } from 'lucide-react';
import { getAlarmNotifications, acknowledgeNotification } from '../api/notifications';
import { snoozeReminder } from '../api/visitReminders';
import { shortDateTime } from '../utils/dateFormat';

// ── Sound via Web Audio API (no external file needed) ────────────────────────

function playAlarmBeep(audioCtx: AudioContext | null): void {
  if (!audioCtx) return;
  try {
    // Two quick beeps: 880Hz + 1100Hz, each 120ms
    const times = [0, 0.18];
    times.forEach((offset) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + offset);
      gain.gain.setValueAtTime(0.4, audioCtx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + offset + 0.12);
      osc.start(audioCtx.currentTime + offset);
      osc.stop(audioCtx.currentTime + offset + 0.15);
    });
  } catch (e) {
    // Silently swallow — AudioContext errors are non-fatal
  }
}

// ── Reminder type labels ─────────────────────────────────────────────────────

const REMINDER_TYPE_LABELS: Record<string, string> = {
  day_before:     '📅 Day-Before Reminder',
  morning_of:     '🌅 Morning-Of Reminder',
  final_reminder: '⏰ Final Reminder — 1 Hour Away'
};

// ── AlarmModal ───────────────────────────────────────────────────────────────

export default function AlarmModal() {
  const queryClient = useQueryClient();
  const audioCtxRef = useRef<AudioContext | null>(null);
  const hasInteractedRef = useRef(false);
  const soundPlayedForRef = useRef<string | null>(null); // track which notification ID we played for
  const [dismissedIds, setDismissedIds] = React.useState<string[]>([]);

  // Track first user interaction to unlock audio
  useEffect(() => {
    const unlock = () => {
      hasInteractedRef.current = true;
      // Create AudioContext on first interaction (satisfies autoplay policy)
      if (!audioCtxRef.current) {
        try {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (e) {
          // AudioContext not available
        }
      }
    };
    window.addEventListener('click', unlock, { once: false, passive: true });
    window.addEventListener('keydown', unlock, { once: false, passive: true });
    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // Poll for high-priority unacknowledged notifications every 60 seconds
  const { data } = useQuery({
    queryKey: ['alarm-notifications'],
    queryFn: getAlarmNotifications,
    refetchInterval: 60_000,
    refetchIntervalInBackground: true,
    staleTime: 0
  });

  // The first unacknowledged high-priority visit_reminder (only show one at a time)
  const alarmNotification = (data?.notifications ?? []).find(
    (n: any) => n.priority === 'high' && n.type === 'visit_reminder' && !n.acknowledgedAt && !dismissedIds.includes(n._id)
  ) ?? null;

  // Play sound when new alarm appears (only once per notification, only after user interaction)
  useEffect(() => {
    if (
      alarmNotification &&
      hasInteractedRef.current &&
      soundPlayedForRef.current !== alarmNotification._id
    ) {
      soundPlayedForRef.current = alarmNotification._id;
      playAlarmBeep(audioCtxRef.current);
    }
  }, [alarmNotification?._id]);

  // Dismiss mutation
  const dismissMutation = useMutation({
    mutationFn: (notifId: string) => acknowledgeNotification(notifId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alarm-notifications'] });
    }
  });

  // Snooze mutation — only needs the notification ID
  const snoozeMutation = useMutation({
    mutationFn: (notifId: string) => snoozeReminder(notifId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alarm-notifications'] });
    }
  });

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => [...prev, id]);
    dismissMutation.mutate(id);
  };

  const handleSnooze = (id: string) => {
    setDismissedIds((prev) => [...prev, id]);
    snoozeMutation.mutate(id);
  };

  if (!alarmNotification) return null;

  const isPending = dismissMutation.isPending || snoozeMutation.isPending;
  const notifId = alarmNotification._id;

  return (
    <>
      {/* Full-screen overlay — NOT dismissible by clicking outside */}
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(8px)' }}
      >
        {/* Pulsing alarm ring effect */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-96 h-96 rounded-full border-2 border-red-500/20 animate-ping opacity-30" />
        </div>

        {/* Alarm card */}
        <div className="relative z-10 w-full max-w-md">
          {/* Red glow backdrop */}
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-red-600/40 via-orange-500/20 to-red-700/40 blur-xl" />

          <div className="relative rounded-3xl bg-[#0f0f1a] border border-red-500/40 shadow-2xl overflow-hidden">
            {/* Top alarm bar with Close Cross Button */}
            <div className="bg-gradient-to-r from-red-600 to-orange-600 px-6 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-white animate-bounce" />
                <span className="text-white font-black text-sm uppercase tracking-widest">
                  Site Visit Alarm
                </span>
              </div>

              {/* TOP-RIGHT OFF / CROSS (X) BUTTON */}
              <button
                type="button"
                onClick={() => handleDismiss(notifId)}
                disabled={isPending}
                className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-all cursor-pointer border border-white/20 hover:scale-110 active:scale-95 shrink-0"
                title="Turn Off / Close Alarm"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            {/* Alarm body */}
            <div className="p-6 space-y-5">
              {/* Reminder type badge */}
              <div className="text-center">
                <span className="text-xs font-black uppercase tracking-widest text-orange-400 bg-orange-500/10 border border-orange-500/30 px-3 py-1 rounded-full">
                  {REMINDER_TYPE_LABELS[alarmNotification.reminderType ?? 'final_reminder'] ?? '⏰ Site Visit Reminder'}
                </span>
              </div>

              {/* Main message */}
              <div className="text-center space-y-2">
                <p className="text-white font-bold text-lg leading-tight">
                  {alarmNotification.message}
                </p>
                {alarmNotification.createdAt && (
                  <p className="text-xs text-slate-500 font-mono">
                    Reminder issued: {shortDateTime(alarmNotification.createdAt)}
                  </p>
                )}
              </div>

              {/* Limitation notice */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-[10px] text-slate-500 leading-relaxed">
                💡 <strong className="text-slate-400">Note:</strong> This alarm only works while this browser tab is open. 
                Close the tab and alarms won't fire — this is a browser limitation, not a bug.
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleSnooze(notifId)}
                  disabled={isPending}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-slate-800 border border-slate-700 text-slate-200 font-bold text-sm hover:bg-slate-700 hover:border-slate-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Clock className="w-4 h-4" />
                  {snoozeMutation.isPending ? 'Snoozing...' : 'Snooze 10 min'}
                </button>

                <button
                  onClick={() => handleDismiss(notifId)}
                  disabled={isPending}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-red-600 to-orange-600 text-white font-black text-sm hover:from-red-500 hover:to-orange-500 transition-all shadow-lg shadow-red-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="w-4 h-4" />
                  {dismissMutation.isPending ? 'Dismissing...' : 'Dismiss'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
