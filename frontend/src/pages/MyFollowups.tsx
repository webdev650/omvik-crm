import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import Navbar from '../components/Navbar';
import { getMyFollowups, completeFollowup } from '../api/followups';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Button } from '../components/ui/button';

// ── Helpers ──────────────────────────────────────────────────────────────────

function dueDateLabel(dueAt: string): { text: string; urgent: boolean } {
  const diff = new Date(dueAt).getTime() - Date.now();
  const minutes = Math.floor(diff / 60_000);
  if (diff < 0) {
    const overdue = Math.abs(Math.floor(diff / 60_000));
    if (overdue < 60) return { text: `${overdue}m overdue`, urgent: true };
    if (overdue < 1440) return { text: `${Math.floor(overdue / 60)}h overdue`, urgent: true };
    return { text: `${Math.floor(overdue / 1440)}d overdue`, urgent: true };
  }
  if (minutes < 60) return { text: `Due in ${minutes}m`, urgent: true };
  if (minutes < 1440) return { text: `Due in ${Math.floor(minutes / 60)}h`, urgent: false };
  return {
    text: new Date(dueAt).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    }),
    urgent: false
  };
}

// ── Followup Row ─────────────────────────────────────────────────────────────

function FollowupRow({ followup, showMark }: { followup: any; showMark: boolean }) {
  const queryClient = useQueryClient();
  const [localDone, setLocalDone] = useState(false);

  const mutation = useMutation({
    mutationFn: () => completeFollowup(followup._id),
    onSuccess: () => {
      setLocalDone(true);
      queryClient.invalidateQueries({ queryKey: ['followups', 'me'] });
    }
  });

  const due = dueDateLabel(followup.dueAt);
  const oppId = typeof followup.opportunity === 'object'
    ? followup.opportunity?._id
    : followup.opportunity;

  return (
    <div
      className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
        localDone
          ? 'opacity-40 border-slate-800 bg-[#0b0f19]/40'
          : followup.status === 'overdue' || followup.status === 'missed'
            ? 'border-red-500/30 bg-red-500/5'
            : followup.status === 'completed'
              ? 'border-emerald-500/20 bg-emerald-500/5'
              : 'border-slate-800 bg-[#0b0f19]/60 hover:border-indigo-500/30'
      }`}
    >
      {/* Status dot */}
      <div className="mt-1 shrink-0">
        {followup.status === 'completed' || localDone ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        ) : followup.status === 'overdue' || followup.status === 'missed' ? (
          <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />
        ) : (
          <Calendar className="w-5 h-5 text-indigo-400" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Customer name & link */}
        <Link
          to={`/leads/${oppId}`}
          className="text-sm font-bold text-slate-100 hover:text-indigo-400 transition-colors"
        >
          {followup.opportunity?.customer?.name
            ?? followup.opportunity?.rawName
            ?? `Opportunity ›`}
        </Link>

        {/* Purpose */}
        {followup.purpose && (
          <p className="text-xs text-slate-400 mt-0.5">
            {followup.purpose}
          </p>
        )}

        {/* Project name */}
        {followup.opportunity?.project?.name && (
          <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
            🏙️ {followup.opportunity.project.name}
          </p>
        )}

        {/* Due label */}
        <p className={`text-[11px] font-bold mt-1 font-mono ${
          due.urgent ? 'text-red-400' : 'text-slate-400'
        }`}>
          ⏰ {due.text}
        </p>
      </div>

      {/* Mark done button */}
      {showMark && !localDone && followup.status !== 'completed' && (
        <Button
          variant="outline"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="shrink-0 text-xs h-8 px-3 border-emerald-500/30 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all font-bold"
        >
          {mutation.isPending ? 'Updating...' : '✓ Mark Done'}
        </Button>
      )}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ status }: { status: string }) {
  const map: Record<string, { icon: string; text: string }> = {
    scheduled: { icon: '🗓️', text: 'No scheduled follow-ups. Great job staying on top of things!' },
    overdue:   { icon: '🎉', text: 'No overdue follow-ups. You\'re all caught up!' },
    completed: { icon: '🏆', text: 'No completed follow-ups yet.' }
  };
  const { icon, text } = map[status] ?? { icon: '📂', text: 'Nothing here.' };
  return (
    <div className="py-12 text-center space-y-2">
      <div className="text-3xl">{icon}</div>
      <p className="text-xs font-semibold text-slate-400">{text}</p>
    </div>
  );
}

// ── Main Page Component ───────────────────────────────────────────────────────

export default function MyFollowups() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['followups', 'me'],
    queryFn: () => getMyFollowups(),
    refetchInterval: 60_000 // auto-refresh every minute
  });

  const all: any[] = data?.followups ?? [];
  const scheduled = all.filter(f => f.status === 'scheduled');
  const overdue   = all.filter(f => f.status === 'overdue' || f.status === 'missed');
  const completed = all.filter(f => f.status === 'completed');

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans pb-16">
      <Navbar />

      <main className="max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page Hero Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#131c31] border border-slate-800/80 p-5 sm:p-6 rounded-2xl shadow-sm">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-bold uppercase tracking-wider">
              <Calendar className="w-3.5 h-3.5" />
              <span>Touchpoint Task Queue</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              My Scheduled Follow-ups
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Scheduled, overdue, and completed actions across all your assigned leads.
            </p>
          </div>

          {!isLoading && !isError && (
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {overdue.length > 0 && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 border border-red-500/30 text-red-400">
                  ⚠️ {overdue.length} Overdue
                </span>
              )}
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                📅 {scheduled.length} Scheduled
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                ✓ {completed.length} Completed
              </span>
            </div>
          )}
        </div>

        {/* Error */}
        {isError && (
          <div className="p-6 rounded-2xl border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-semibold">
            Failed to load follow-ups. Please refresh the page.
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 w-full bg-[#131c31] border border-slate-800/80 rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Tabs */}
        {!isLoading && !isError && (
          <div className="bg-[#131c31] border border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
            <Tabs defaultValue={overdue.length > 0 ? 'overdue' : 'scheduled'}>
              <TabsList className="bg-[#0b0f19] p-1 border border-slate-800 rounded-xl">
                <TabsTrigger value="overdue" className="text-xs font-bold">
                  Overdue
                  {overdue.length > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold">
                      {overdue.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="scheduled" className="text-xs font-bold">
                  Scheduled
                  {scheduled.length > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold">
                      {scheduled.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="completed" className="text-xs font-bold">Completed</TabsTrigger>
              </TabsList>

              {/* Overdue */}
              <TabsContent value="overdue" className="pt-3 space-y-3">
                {overdue.length === 0
                  ? <EmptyState status="overdue" />
                  : overdue.map(f => (
                      <FollowupRow key={f._id} followup={f} showMark={true} />
                    ))
                }
              </TabsContent>

              {/* Scheduled */}
              <TabsContent value="scheduled" className="pt-3 space-y-3">
                {scheduled.length === 0
                  ? <EmptyState status="scheduled" />
                  : scheduled.map(f => (
                      <FollowupRow key={f._id} followup={f} showMark={true} />
                    ))
                }
              </TabsContent>

              {/* Completed */}
              <TabsContent value="completed" className="pt-3 space-y-3">
                {completed.length === 0
                  ? <EmptyState status="completed" />
                  : completed.map(f => (
                      <FollowupRow key={f._id} followup={f} showMark={false} />
                    ))
                }
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>
    </div>
  );
}
