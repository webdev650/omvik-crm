import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getActivities } from '../../api/activities';

// ── helpers ────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const CHANNEL_META: Record<string, { icon: string; label: string; color: string }> = {
  call:      { icon: '📞', label: 'Phone Call',  color: 'text-blue-400'   },
  whatsapp:  { icon: '💬', label: 'WhatsApp',    color: 'text-emerald-400' },
  email:     { icon: '📧', label: 'Email',       color: 'text-violet-400'  },
  meeting:   { icon: '🤝', label: 'Meeting',     color: 'text-amber-400'   },
  note:      { icon: '📝', label: 'Note',        color: 'text-slate-400'   },
};

const OUTCOME_META: Record<string, { label: string; color: string }> = {
  connected:       { label: 'Connected',       color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' },
  no_answer:       { label: 'No Answer',       color: 'bg-slate-700/60   border-slate-600      text-slate-400'   },
  busy:            { label: 'Busy',            color: 'bg-amber-500/10   border-amber-500/30   text-amber-400'   },
  switched_off:    { label: 'Switched Off',    color: 'bg-slate-700/60   border-slate-600      text-slate-400'   },
  wrong_number:    { label: 'Wrong Number',    color: 'bg-red-500/10     border-red-500/30     text-red-400'     },
  interested:      { label: 'Interested',      color: 'bg-indigo-500/10  border-indigo-500/30  text-indigo-400'  },
  not_interested:  { label: 'Not Interested',  color: 'bg-red-500/10     border-red-500/30     text-red-400'     },
};

// ── component ───────────────────────────────────────────────────────────────

interface Props {
  opportunityId: string;
}

export default function ActivityTimeline({ opportunityId }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['activities', opportunityId],
    queryFn: () => getActivities(opportunityId),
    enabled: !!opportunityId
  });

  const activities: any[] = data?.activities ?? [];

  // ── loading ──
  if (isLoading) {
    return (
      <div className="space-y-4 py-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-slate-800/60 animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-32 bg-slate-800/60 rounded animate-pulse" />
              <div className="h-10 w-full bg-slate-800/40 rounded-xl animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── error ──
  if (isError) {
    return (
      <p className="text-sm text-red-400 py-4">
        Failed to load activity timeline. Please refresh and try again.
      </p>
    );
  }

  // ── empty ──
  if (activities.length === 0) {
    return (
      <div className="py-10 text-center space-y-2">
        <div className="text-3xl">🗂️</div>
        <p className="text-sm font-semibold text-slate-300">No activities yet</p>
        <p className="text-xs text-slate-500">
          Use the "Log Activity" tab to record your first contact attempt with this lead.
        </p>
      </div>
    );
  }

  // ── timeline ──
  return (
    <ol className="relative space-y-0">
      {activities.map((act: any, index: number) => {
        const ch = CHANNEL_META[act.channel] ?? { icon: '📌', label: act.channel, color: 'text-slate-400' };
        const oc = OUTCOME_META[act.outcome] ?? { label: act.outcome, color: 'bg-slate-700/60 border-slate-600 text-slate-400' };
        const isLast = index === activities.length - 1;

        return (
          <li key={act._id} className="flex gap-4">
            {/* Vertical connector line + icon */}
            <div className="flex flex-col items-center">
              <div className="w-9 h-9 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-base shrink-0 shadow-md">
                {ch.icon}
              </div>
              {!isLast && (
                <div className="w-px flex-1 bg-slate-800 mt-1 mb-1 min-h-[1.5rem]" />
              )}
            </div>

            {/* Content */}
            <div className={`flex-1 pb-6 ${isLast ? '' : ''}`}>
              {/* Header row */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`text-xs font-bold uppercase tracking-wider ${ch.color}`}>
                  {ch.label}
                </span>

                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${oc.color}`}>
                  {oc.label}
                </span>

                <span className="ml-auto text-[11px] text-slate-500 font-mono whitespace-nowrap">
                  {timeAgo(act.createdAt)}
                </span>
              </div>

              {/* Notes */}
              {act.notes && (
                <p className="text-sm text-slate-300 leading-relaxed bg-slate-800/40 rounded-xl px-4 py-3 border border-slate-800">
                  {act.notes}
                </p>
              )}
              {!act.notes && (
                <p className="text-xs text-slate-600 italic">No notes recorded.</p>
              )}

              {/* Footer: who logged it */}
              <p className="text-[11px] text-slate-500 mt-2">
                Logged by{' '}
                <span className="font-semibold text-slate-400">
                  {act.user?.name ?? 'Unknown'}
                </span>
                {' · '}
                {new Date(act.createdAt).toLocaleString('en-IN', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
