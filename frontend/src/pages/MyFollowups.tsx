import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Navbar from '../components/Navbar';
import { getMyFollowups, completeFollowup } from '../api/followups';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

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
      className={`flex items-start gap-4 p-4 rounded-2xl border transition-all duration-300 ${
        localDone
          ? 'opacity-40 border-slate-800 bg-slate-900/30'
          : followup.status === 'overdue' || followup.status === 'missed'
            ? 'border-red-500/20 bg-red-500/5'
            : followup.status === 'completed'
              ? 'border-emerald-500/15 bg-emerald-500/5'
              : 'border-slate-800 bg-slate-900/60 hover:border-indigo-500/30'
      }`}
    >
      {/* Status dot */}
      <div className="mt-1 shrink-0">
        {followup.status === 'completed' || localDone ? (
          <span className="text-emerald-400 text-lg">✓</span>
        ) : followup.status === 'overdue' || followup.status === 'missed' ? (
          <span className="text-red-400 animate-pulse text-lg">⚠️</span>
        ) : (
          <span className="text-indigo-400 text-lg">📅</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Customer name & link */}
        <Link
          to={`/leads/${oppId}`}
          className="text-sm font-semibold text-slate-100 hover:text-indigo-400 transition-colors"
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
          <p className="text-[11px] text-slate-500 mt-0.5">
            {followup.opportunity.project.name}
          </p>
        )}

        {/* Due label */}
        <p className={`text-[11px] font-semibold mt-1 font-mono ${
          due.urgent ? 'text-red-400' : 'text-slate-400'
        }`}>
          {due.text}
        </p>
      </div>

      {/* Mark done button */}
      {showMark && !localDone && followup.status !== 'completed' && (
        <Button
          variant="outline"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="shrink-0 text-[11px] h-8 px-3 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
        >
          {mutation.isPending ? '...' : '✓ Mark Done'}
        </Button>
      )}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ status }: { status: string }) {
  const map: Record<string, { icon: string; text: string }> = {
    scheduled: { icon: '🗓️', text: 'No scheduled follow-ups. Great job staying on top of things!' },
    overdue:   { icon: '✅', text: 'No overdue follow-ups. You\'re all caught up!' },
    completed: { icon: '🏆', text: 'No completed follow-ups yet.' }
  };
  const { icon, text } = map[status] ?? { icon: '📂', text: 'Nothing here.' };
  return (
    <div className="py-12 text-center space-y-2">
      <div className="text-4xl">{icon}</div>
      <p className="text-sm text-slate-400">{text}</p>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function MyFollowups() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['followups', 'me'],
    queryFn: () => getMyFollowups(),
    refetchInterval: 60_000 // auto-refresh every minute (overdue can change)
  });

  const all: any[] = data?.followups ?? [];
  const scheduled = all.filter(f => f.status === 'scheduled');
  const overdue   = all.filter(f => f.status === 'overdue' || f.status === 'missed');
  const completed = all.filter(f => f.status === 'completed');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 relative overflow-hidden">
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        <Navbar />

        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold tracking-tight text-white">My Follow-ups</h1>
          <p className="text-sm text-slate-400 mt-1">
            Scheduled, overdue, and completed actions across all your leads.
          </p>
        </div>

        {/* Summary pill row */}
        {!isLoading && !isError && (
          <div className="flex flex-wrap gap-3 mb-6">
            {overdue.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 border border-red-500/30 text-red-400">
                ⚠️ {overdue.length} Overdue
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              📅 {scheduled.length} Scheduled
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              ✓ {completed.length} Completed
            </span>
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="p-6 rounded-2xl border border-red-500/20 bg-red-500/5 text-red-400 text-sm">
            Failed to load follow-ups. Please refresh the page.
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 w-full bg-slate-800/40 rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Tabs */}
        {!isLoading && !isError && (
          <Tabs defaultValue={overdue.length > 0 ? 'overdue' : 'scheduled'}>
            <TabsList>
              <TabsTrigger value="overdue">
                Overdue
                {overdue.length > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                    {overdue.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="scheduled">
                Scheduled
                {scheduled.length > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold leading-none">
                    {scheduled.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>

            {/* ── Overdue ── */}
            <TabsContent value="overdue">
              <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl">
                <CardContent className="p-4 space-y-3">
                  {overdue.length === 0
                    ? <EmptyState status="overdue" />
                    : overdue.map(f => (
                        <FollowupRow key={f._id} followup={f} showMark={true} />
                      ))
                  }
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Scheduled ── */}
            <TabsContent value="scheduled">
              <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl">
                <CardContent className="p-4 space-y-3">
                  {scheduled.length === 0
                    ? <EmptyState status="scheduled" />
                    : scheduled.map(f => (
                        <FollowupRow key={f._id} followup={f} showMark={true} />
                      ))
                  }
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Completed ── */}
            <TabsContent value="completed">
              <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl">
                <CardContent className="p-4 space-y-3">
                  {completed.length === 0
                    ? <EmptyState status="completed" />
                    : completed.map(f => (
                        <FollowupRow key={f._id} followup={f} showMark={false} />
                      ))
                  }
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
