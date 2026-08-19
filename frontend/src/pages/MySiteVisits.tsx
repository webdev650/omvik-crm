import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Navbar from '../components/Navbar';
import { getMySiteVisits, updateSiteVisit } from '../api/siteVisits';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../components/ui/dialog';

// ── Site Visit Row Component ────────────────────────────────────────────────

function SiteVisitRow({ visit, onComplete }: { visit: any; onComplete: (visit: any) => void }) {
  const oppId = typeof visit.opportunity === 'object'
    ? visit.opportunity?._id
    : visit.opportunity;

  const isCompleted = visit.status === 'completed';

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-start justify-between gap-4 p-4 rounded-2xl border transition-all duration-200 ${
        isCompleted
          ? 'border-emerald-500/20 bg-emerald-500/5'
          : visit.status === 'no_show' || visit.status === 'cancelled'
          ? 'border-red-500/20 bg-red-500/5'
          : 'border-slate-800 bg-slate-900/60 hover:border-indigo-500/30'
      }`}
    >
      {/* Icon & Content */}
      <div className="flex items-start gap-3.5 min-w-0 flex-1">
        <div className="mt-1 shrink-0 text-xl">
          {isCompleted ? (
            <span className="text-emerald-400">🏡</span>
          ) : (
            <span className="text-indigo-400">📅</span>
          )}
        </div>

        <div className="space-y-1.5 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={`/leads/${oppId}`}
              className="text-base font-bold text-slate-100 hover:text-indigo-300 transition-colors truncate"
            >
              {visit.opportunity?.customer?.name || visit.opportunity?.rawName || 'Lead Opportunity'}
            </Link>

            <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${
              isCompleted ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
              visit.status === 'planned' || visit.status === 'confirmed' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' :
              'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              {visit.status}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400 font-mono">
            <span>🏙️ {visit.opportunity?.project?.name || 'Project'}</span>
            <span>📱 {visit.opportunity?.customer?.primaryMobile || 'N/A'}</span>
          </div>

          <p className="text-xs font-semibold text-indigo-400 font-mono">
            ⏰ {new Date(visit.scheduledAt).toLocaleString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            })}
          </p>

          {visit.feedback?.notes && (
            <p className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 mt-1">
              {visit.feedback.notes}
            </p>
          )}

          {isCompleted && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-xs space-y-1 mt-2">
              <div className="flex items-center gap-3 flex-wrap">
                <span>Response: <strong className="text-indigo-300 capitalize">{visit.feedback?.response}</strong></span>
                <span>Interest: <strong className="text-emerald-300 capitalize">{visit.feedback?.interest}</strong></span>
                {visit.feedback?.objection && (
                  <span>Objection: <strong className="text-amber-300 capitalize">{visit.feedback.objection}</strong></span>
                )}
              </div>
              {visit.nextAction && (
                <p className="text-indigo-300 font-semibold pt-1">
                  ➡️ Next Action: {visit.nextAction}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Button */}
      {(visit.status === 'planned' || visit.status === 'confirmed') && (
        <Button
          onClick={() => onComplete(visit)}
          className="shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-9 px-4 font-bold shadow-md shadow-emerald-600/20"
        >
          ✓ Complete Visit
        </Button>
      )}
    </div>
  );
}

// ── Empty State Component ───────────────────────────────────────────────────

function EmptyState({ status }: { status: string }) {
  const map: Record<string, { icon: string; text: string }> = {
    planned: { icon: '🏡', text: 'No planned site visits scheduled.' },
    completed: { icon: '🏆', text: 'No completed site visits yet.' }
  };
  const { icon, text } = map[status] ?? { icon: '📂', text: 'Nothing here.' };
  return (
    <div className="py-12 text-center space-y-2">
      <div className="text-4xl">{icon}</div>
      <p className="text-sm text-slate-400 font-medium">{text}</p>
    </div>
  );
}

// ── Main Page Component ─────────────────────────────────────────────────────

export default function MySiteVisits() {
  const queryClient = useQueryClient();

  const [completeVisit, setCompleteVisit] = useState<any | null>(null);
  const [feedbackResponse, setFeedbackResponse] = useState<'liked' | 'neutral' | 'disliked'>('liked');
  const [feedbackInterest, setFeedbackInterest] = useState<'high' | 'medium' | 'low'>('high');
  const [feedbackObjection, setFeedbackObjection] = useState<string>('price');
  const [feedbackNotes, setFeedbackNotes] = useState<string>('');
  const [nextActionInput, setNextActionInput] = useState<string>('');
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Fetch Site Visits
  const { data, isLoading, isError } = useQuery({
    queryKey: ['siteVisits', 'me'],
    queryFn: () => getMySiteVisits(),
    refetchInterval: 60_000
  });

  const allVisits: any[] = data?.siteVisits || [];
  const planned = allVisits.filter((v) => v.status === 'planned' || v.status === 'confirmed');
  const completed = allVisits.filter((v) => v.status === 'completed');

  // Complete Mutation
  const completeMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      updateSiteVisit(id, payload),
    onSuccess: () => {
      setErrorBanner(null);
      queryClient.invalidateQueries({ queryKey: ['siteVisits'] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      setCompleteVisit(null);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.errors?.[0] || err.response?.data?.message || 'Failed to complete site visit';
      setErrorBanner(msg);
    }
  });

  const handleCompleteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeVisit) return;
    if (!nextActionInput.trim()) {
      setErrorBanner('Next Action is mandatory when completing a site visit.');
      return;
    }

    completeMutation.mutate({
      id: completeVisit._id,
      payload: {
        status: 'completed',
        feedback: {
          response: feedbackResponse,
          interest: feedbackInterest,
          objection: feedbackObjection,
          notes: feedbackNotes
        },
        nextAction: nextActionInput.trim()
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 relative overflow-hidden">
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10 space-y-6">
        <Navbar />

        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <span>🏡 My Site Visits</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Planned tours and completed feedback for all your assigned leads.
          </p>
        </div>

        {/* Summary Pills */}
        {!isLoading && !isError && (
          <div className="flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              📅 {planned.length} Planned / Confirmed
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              ✓ {completed.length} Completed
            </span>
          </div>
        )}

        {errorBanner && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center justify-between">
            <span>⚠️ {errorBanner}</span>
            <button onClick={() => setErrorBanner(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Loading / Error / Tabs */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 w-full bg-slate-800/40 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-6 rounded-2xl border border-red-500/20 bg-red-500/5 text-red-400 text-sm">
            Failed to load site visits. Please refresh the page.
          </div>
        ) : (
          <Tabs defaultValue={planned.length > 0 ? 'planned' : 'completed'}>
            <TabsList>
              <TabsTrigger value="planned">
                Planned
                {planned.length > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold leading-none">
                    {planned.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed
                {completed.length > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold leading-none">
                    {completed.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* ── Planned Tab ── */}
            <TabsContent value="planned">
              <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl">
                <CardContent className="p-4 space-y-3">
                  {planned.length === 0 ? (
                    <EmptyState status="planned" />
                  ) : (
                    planned.map((visit) => (
                      <SiteVisitRow
                        key={visit._id}
                        visit={visit}
                        onComplete={(v) => {
                          setErrorBanner(null);
                          setCompleteVisit(v);
                          setNextActionInput(v.nextAction || '');
                        }}
                      />
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Completed Tab ── */}
            <TabsContent value="completed">
              <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl">
                <CardContent className="p-4 space-y-3">
                  {completed.length === 0 ? (
                    <EmptyState status="completed" />
                  ) : (
                    completed.map((visit) => (
                      <SiteVisitRow
                        key={visit._id}
                        visit={visit}
                        onComplete={() => {}}
                      />
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* ── Mandatory Completion Feedback Modal ── */}
        {completeVisit && (
          <Dialog open={!!completeVisit} onOpenChange={() => setCompleteVisit(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>📝 Complete Site Visit Feedback (Section AE)</DialogTitle>
                <DialogDescription>
                  Record client reaction, interest level, and mandatory next action.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCompleteSubmit} className="space-y-5 pt-2">
                {/* Radio Group 1: Overall Response */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-300">
                    Overall Response <span className="text-red-400">*</span>
                  </Label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'liked', label: '👍 Liked', color: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' },
                      { id: 'neutral', label: '😐 Neutral', color: 'border-amber-500/50 bg-amber-500/10 text-amber-400' },
                      { id: 'disliked', label: '👎 Disliked', color: 'border-red-500/50 bg-red-500/10 text-red-400' }
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setFeedbackResponse(item.id as any)}
                        className={`p-3 rounded-xl border text-xs font-bold transition-all text-center ${
                          feedbackResponse === item.id
                            ? `${item.color} ring-2 ring-indigo-500/40 shadow-lg`
                            : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Radio Group 2: Interest Level */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-300">
                    Interest Level <span className="text-red-400">*</span>
                  </Label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'high', label: '🔥 High', color: 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300' },
                      { id: 'medium', label: '⚡ Medium', color: 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300' },
                      { id: 'low', label: '❄️ Low', color: 'border-slate-700 bg-slate-800/40 text-slate-400' }
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setFeedbackInterest(item.id as any)}
                        className={`p-3 rounded-xl border text-xs font-bold transition-all text-center ${
                          feedbackInterest === item.id
                            ? `${item.color} ring-2 ring-indigo-500/40 shadow-lg`
                            : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Select: Primary Objection */}
                <div className="space-y-2">
                  <Label htmlFor="objection">Primary Objection <span className="text-slate-500 font-normal text-xs">(optional)</span></Label>
                  <select
                    id="objection"
                    value={feedbackObjection}
                    onChange={(e) => setFeedbackObjection(e.target.value)}
                    className="flex h-11 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="price">Price / Budget</option>
                    <option value="location">Location / Accessibility</option>
                    <option value="size">Flat Size / Layout</option>
                    <option value="amenities">Amenities</option>
                    <option value="documentation">Documentation / Legal</option>
                    <option value="finance">Home Loan / Finance</option>
                    <option value="possession">Possession Date</option>
                    <option value="family">Family Approval</option>
                    <option value="competitor">Chosen Competitor</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Text Input: Next Action (Required) */}
                <div className="space-y-2">
                  <Label htmlFor="nextAction">Mandatory Next Action <span className="text-red-400">*</span></Label>
                  <input
                    id="nextAction"
                    type="text"
                    placeholder="e.g. Send revised pricing sheet with floor rise discount"
                    value={nextActionInput}
                    onChange={(e) => setNextActionInput(e.target.value)}
                    className="flex h-11 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                    required
                  />
                </div>

                {/* Textarea: Notes */}
                <div className="space-y-2">
                  <Label htmlFor="feedbackNotes">Visit Notes <span className="text-slate-500 font-normal text-xs">(optional)</span></Label>
                  <Textarea
                    id="feedbackNotes"
                    placeholder="Key observations during tour..."
                    value={feedbackNotes}
                    onChange={(e) => setFeedbackNotes(e.target.value)}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setCompleteVisit(null)} className="text-xs h-9">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={completeMutation.isPending} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-9 px-4 font-bold">
                    {completeMutation.isPending ? 'Saving...' : 'Complete & Save Feedback'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
