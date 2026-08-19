import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSiteVisits, scheduleSiteVisit, updateSiteVisit } from '../../api/siteVisits';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../../components/ui/dialog';

function minDateTimeLocal(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

interface Props {
  opportunityId: string;
}

export default function OpportunitySiteVisits({ opportunityId }: Props) {
  const queryClient = useQueryClient();

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduledAtInput, setScheduledAtInput] = useState('');
  const [scheduleNotesInput, setScheduleNotesInput] = useState('');

  const [completeVisit, setCompleteVisit] = useState<any | null>(null);
  const [feedbackResponse, setFeedbackResponse] = useState<'liked' | 'neutral' | 'disliked'>('liked');
  const [feedbackInterest, setFeedbackInterest] = useState<'high' | 'medium' | 'low'>('high');
  const [feedbackObjection, setFeedbackObjection] = useState<string>('price');
  const [feedbackNotes, setFeedbackNotes] = useState<string>('');
  const [nextActionInput, setNextActionInput] = useState<string>('');

  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Fetch site visits for this opportunity
  const { data, isLoading, isError } = useQuery({
    queryKey: ['siteVisits', opportunityId],
    queryFn: () => getSiteVisits(opportunityId),
    enabled: !!opportunityId
  });

  const siteVisits: any[] = data?.siteVisits || [];

  // Schedule mutation
  const scheduleMutation = useMutation({
    mutationFn: (payload: { scheduledAt: string; notes?: string }) =>
      scheduleSiteVisit(opportunityId, payload),
    onSuccess: () => {
      setErrorBanner(null);
      queryClient.invalidateQueries({ queryKey: ['siteVisits', opportunityId] });
      queryClient.invalidateQueries({ queryKey: ['opportunity', opportunityId] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      setScheduleOpen(false);
      setScheduledAtInput('');
      setScheduleNotesInput('');
    },
    onError: (err: any) => {
      setErrorBanner(err.response?.data?.message || 'Failed to schedule site visit');
    }
  });

  // Complete mutation
  const completeMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      updateSiteVisit(id, payload),
    onSuccess: () => {
      setErrorBanner(null);
      queryClient.invalidateQueries({ queryKey: ['siteVisits', opportunityId] });
      queryClient.invalidateQueries({ queryKey: ['opportunity', opportunityId] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      setCompleteVisit(null);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.errors?.[0] || err.response?.data?.message || 'Failed to complete site visit';
      setErrorBanner(msg);
    }
  });

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduledAtInput) {
      setErrorBanner('Please select a date and time for the site visit');
      return;
    }
    scheduleMutation.mutate({
      scheduledAt: scheduledAtInput,
      notes: scheduleNotesInput
    });
  };

  const handleCompleteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeVisit) return;
    if (!nextActionInput.trim()) {
      setErrorBanner('Next Action is mandatory when marking a site visit completed.');
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
    <div className="space-y-4">
      {/* Action Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white">Site Visit Log</h3>
          <p className="text-xs text-slate-400">
            Track site visit schedules, buyer feedback, and objections.
          </p>
        </div>

        <Button
          onClick={() => {
            setErrorBanner(null);
            setScheduleOpen(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold h-9 px-3"
        >
          + Schedule Site Visit
        </Button>
      </div>

      {errorBanner && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
          ⚠️ {errorBanner}
        </div>
      )}

      {/* Visits List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 bg-slate-800/40 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <p className="text-xs text-red-400">Failed to load site visits.</p>
      ) : siteVisits.length === 0 ? (
        <div className="py-8 text-center space-y-2 border border-dashed border-slate-800 rounded-2xl">
          <div className="text-3xl">🏡</div>
          <p className="text-xs font-semibold text-slate-300">No site visits scheduled</p>
          <p className="text-[11px] text-slate-500">
            Click "+ Schedule Site Visit" above to record an upcoming client site tour.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {siteVisits.map((v: any) => (
            <div
              key={v._id}
              className={`p-4 rounded-xl border transition-all ${
                v.status === 'completed'
                  ? 'border-emerald-500/20 bg-emerald-500/5'
                  : v.status === 'no_show' || v.status === 'cancelled'
                  ? 'border-red-500/20 bg-red-500/5'
                  : 'border-slate-800 bg-slate-950/60'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-200">
                      📅 {new Date(v.scheduledAt).toLocaleString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>

                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                      v.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                      v.status === 'planned' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' :
                      'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {v.status}
                    </span>
                  </div>

                  {v.feedback?.notes && (
                    <p className="text-xs text-slate-300 mt-1">
                      {v.feedback.notes}
                    </p>
                  )}

                  {v.status === 'completed' && (
                    <div className="pt-2 mt-2 border-t border-slate-800 text-[11px] space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">Response:</span>
                        <span className="font-semibold text-indigo-300 capitalize">{v.feedback?.response}</span>
                        <span className="text-slate-400 ml-2">Interest:</span>
                        <span className="font-semibold text-emerald-300 capitalize">{v.feedback?.interest}</span>
                        {v.feedback?.objection && (
                          <>
                            <span className="text-slate-400 ml-2">Objection:</span>
                            <span className="font-semibold text-amber-300 capitalize">{v.feedback.objection}</span>
                          </>
                        )}
                      </div>
                      {v.nextAction && (
                        <p className="text-indigo-400 font-semibold">
                          ➡️ Next Action: {v.nextAction}
                        </p>
                      )}
                    </div>
                  )}

                  <p className="text-[10px] text-slate-500">
                    Scheduled by {v.scheduledBy?.name || 'User'}
                  </p>
                </div>

                {(v.status === 'planned' || v.status === 'confirmed') && (
                  <Button
                    onClick={() => {
                      setErrorBanner(null);
                      setCompleteVisit(v);
                      setNextActionInput(v.nextAction || '');
                    }}
                    className="shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8 px-3 font-semibold"
                  >
                    ✓ Mark Completed
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Schedule Modal ── */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🏡 Schedule Site Visit</DialogTitle>
            <DialogDescription>
              Set a date and time for the property tour.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleScheduleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="scheduledAt">Date & Time <span className="text-red-400">*</span></Label>
              <input
                id="scheduledAt"
                type="datetime-local"
                min={minDateTimeLocal()}
                value={scheduledAtInput}
                onChange={(e) => setScheduledAtInput(e.target.value)}
                className="flex h-11 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none [color-scheme:dark]"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes / Instructions <span className="text-slate-500 font-normal text-xs">(optional)</span></Label>
              <Textarea
                id="notes"
                placeholder="e.g. Pickup from metro station, interested in 3BHK east facing..."
                value={scheduleNotesInput}
                onChange={(e) => setScheduleNotesInput(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setScheduleOpen(false)} className="text-xs h-9">
                Cancel
              </Button>
              <Button type="submit" disabled={scheduleMutation.isPending} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-9 px-4">
                {scheduleMutation.isPending ? 'Scheduling...' : 'Schedule Visit'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
                  placeholder="e.g. Send updated pricing sheet with floor rise discount"
                  value={nextActionInput}
                  onChange={(e) => setNextActionInput(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>

              {/* Textarea: Notes */}
              <div className="space-y-2">
                <Label htmlFor="feedbackNotes">Detailed Visit Notes <span className="text-slate-500 font-normal text-xs">(optional)</span></Label>
                <Textarea
                  id="feedbackNotes"
                  placeholder="Key observations during site tour..."
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
  );
}
