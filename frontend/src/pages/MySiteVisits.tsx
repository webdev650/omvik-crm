import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Home, Calendar, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import Navbar from '../components/Navbar';
import { getMySiteVisits, updateSiteVisit } from '../api/siteVisits';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
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
      className={`flex flex-col sm:flex-row sm:items-start justify-between gap-4 p-4 rounded-xl border transition-all ${
        isCompleted
          ? 'border-emerald-500/20 bg-emerald-500/5'
          : visit.status === 'no_show' || visit.status === 'cancelled'
          ? 'border-red-500/20 bg-red-500/5'
          : 'border-slate-800 bg-[#0b0f19]/60 hover:border-indigo-500/30'
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
              className="text-sm font-bold text-slate-100 hover:text-indigo-300 transition-colors truncate"
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
            <p className="text-xs text-slate-300 bg-[#0b0f19]/80 p-2.5 rounded-xl border border-slate-800/80 mt-1">
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
          className="shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-9 px-4 font-bold rounded-xl shadow-md shadow-emerald-600/20"
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
      <div className="text-3xl">{icon}</div>
      <p className="text-xs font-semibold text-slate-400">{text}</p>
    </div>
  );
}

import { usePageSEO } from '../hooks/usePageSEO';

// ── Main Page Component ─────────────────────────────────────────────────────

export default function MySiteVisits() {
  usePageSEO({
    title: 'Site Visit Management & Logistics',
    description: 'Schedule, log feedback, and track real-estate project property site visit tours.'
  });

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
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans pb-16">
      <Navbar />

      <main className="max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page Hero Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#131c31] border border-slate-800/80 p-5 sm:p-6 rounded-2xl shadow-sm">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-bold uppercase tracking-wider">
              <Home className="w-3.5 h-3.5" />
              <span>Site Tour Management</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              My Site Visits
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Planned tours and completed feedback for all your assigned leads.
            </p>
          </div>

          {!isLoading && !isError && (
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                📅 {planned.length} Planned / Confirmed
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                ✓ {completed.length} Completed
              </span>
            </div>
          )}
        </div>

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
              <div key={i} className="h-24 w-full bg-[#131c31] border border-slate-800/80 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-6 rounded-2xl border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-semibold">
            Failed to load site visits. Please refresh the page.
          </div>
        ) : (
          <div className="bg-[#131c31] border border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
            <Tabs defaultValue={planned.length > 0 ? 'planned' : 'completed'}>
              <TabsList className="bg-[#0b0f19] p-1 border border-slate-800 rounded-xl">
                <TabsTrigger value="planned" className="text-xs font-bold">
                  Planned
                  {planned.length > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold">
                      {planned.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="completed" className="text-xs font-bold">
                  Completed
                  {completed.length > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                      {completed.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Planned Tab */}
              <TabsContent value="planned" className="pt-3 space-y-3">
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
              </TabsContent>

              {/* Completed Tab */}
              <TabsContent value="completed" className="pt-3 space-y-3">
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
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Completion Feedback Modal */}
        {completeVisit && (
          <Dialog open={!!completeVisit} onOpenChange={() => setCompleteVisit(null)}>
            <DialogContent className="bg-[#0d1322] border-slate-800 text-slate-100 rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-white">📝 Complete Site Visit Feedback</DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  Record client reaction, interest level, and mandatory next action.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCompleteSubmit} className="space-y-4 pt-2">
                {/* Radio Group 1: Overall Response */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-300">
                    Overall Response <span className="text-red-400">*</span>
                  </Label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { id: 'liked', label: '👍 Liked', color: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' },
                      { id: 'neutral', label: '😐 Neutral', color: 'border-amber-500/50 bg-amber-500/10 text-amber-400' },
                      { id: 'disliked', label: '👎 Disliked', color: 'border-red-500/50 bg-red-500/10 text-red-400' }
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setFeedbackResponse(item.id as any)}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                          feedbackResponse === item.id
                            ? `${item.color} ring-2 ring-indigo-500/40 shadow-lg`
                            : 'border-slate-800 bg-[#0b0f19] text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Radio Group 2: Interest Level */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-300">
                    Interest Level <span className="text-red-400">*</span>
                  </Label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { id: 'high', label: '🔥 High', color: 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300' },
                      { id: 'medium', label: '⚡ Medium', color: 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300' },
                      { id: 'low', label: '❄️ Low', color: 'border-slate-700 bg-slate-800/40 text-slate-400' }
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setFeedbackInterest(item.id as any)}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                          feedbackInterest === item.id
                            ? `${item.color} ring-2 ring-indigo-500/40 shadow-lg`
                            : 'border-slate-800 bg-[#0b0f19] text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Select: Primary Objection */}
                <div className="space-y-1.5">
                  <Label htmlFor="objection" className="text-xs font-bold text-slate-300">
                    Primary Objection <span className="text-slate-500 font-normal text-xs">(optional)</span>
                  </Label>
                  <select
                    id="objection"
                    value={feedbackObjection}
                    onChange={(e) => setFeedbackObjection(e.target.value)}
                    className="flex h-10 w-full rounded-xl border border-slate-800 bg-[#0b0f19] px-3 text-xs text-slate-100 focus:border-indigo-600 focus:outline-none"
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
                <div className="space-y-1.5">
                  <Label htmlFor="nextAction" className="text-xs font-bold text-slate-300">
                    Mandatory Next Action <span className="text-red-400">*</span>
                  </Label>
                  <input
                    id="nextAction"
                    type="text"
                    placeholder="e.g. Send revised pricing sheet with floor rise discount"
                    value={nextActionInput}
                    onChange={(e) => setNextActionInput(e.target.value)}
                    className="flex h-10 w-full rounded-xl border border-slate-800 bg-[#0b0f19] px-3.5 text-xs text-slate-100 focus:border-indigo-600 focus:outline-none"
                    required
                  />
                </div>

                {/* Textarea: Notes */}
                <div className="space-y-1.5">
                  <Label htmlFor="feedbackNotes" className="text-xs font-bold text-slate-300">
                    Visit Notes <span className="text-slate-500 font-normal text-xs">(optional)</span>
                  </Label>
                  <Textarea
                    id="feedbackNotes"
                    placeholder="Key observations during tour..."
                    value={feedbackNotes}
                    onChange={(e) => setFeedbackNotes(e.target.value)}
                    className="bg-[#0b0f19] border-slate-800 text-xs rounded-xl focus:border-indigo-600"
                  />
                </div>

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => setCompleteVisit(null)} className="text-xs h-9 rounded-xl">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={completeMutation.isPending} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-9 px-4 font-bold rounded-xl">
                    {completeMutation.isPending ? 'Saving...' : 'Complete & Save Feedback'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </main>
    </div>
  );
}
