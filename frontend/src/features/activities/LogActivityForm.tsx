import React, { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logActivity } from '../../api/activities';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';

// ── Mirror the backend's Next Action Rule exactly ───────────────────────────
//
// nextFollowup.dueAt is REQUIRED unless:
//   - outcome === 'not_interested'   (lead closed — not interested)
//   - stage === 'won'                (deal closed won)
//   - stage === 'lost'               (deal closed lost)
//
// This gives the user an inline Zod error BEFORE hitting the API.
// The backend still enforces it independently.

const CLOSED_OUTCOMES = ['not_interested'] as const;
const CLOSED_STAGES   = ['won', 'lost']    as const;

const logActivitySchema = z
  .object({
    channel: z.enum(['call', 'whatsapp', 'email', 'meeting', 'note'], {
      required_error: 'Please select a contact channel'
    }),
    outcome: z.enum(
      ['connected', 'no_answer', 'busy', 'switched_off', 'wrong_number', 'interested', 'not_interested'],
      { required_error: 'Please select an outcome' }
    ),
    notes: z.string().optional(),
    stage: z
      .enum(['new', 'contacted', 'qualified', 'site_visit', 'negotiation', 'nurture', 'won', 'lost'])
      .optional(),
    nextFollowup: z
      .object({
        dueAt:   z.string().min(1, 'Follow-up date & time is required'),
        purpose: z.string().optional()
      })
      .optional()
  })
  .refine(
    (data) => {
      // Exempt closed outcomes & stages — no follow-up needed
      const isClosed =
        (CLOSED_OUTCOMES as readonly string[]).includes(data.outcome) ||
        (data.stage && (CLOSED_STAGES as readonly string[]).includes(data.stage));

      if (isClosed) return true;

      // For all other active outcomes: nextFollowup.dueAt is mandatory
      return !!(data.nextFollowup?.dueAt?.trim());
    },
    {
      message: "A follow-up date & time is required for active outcomes. Only 'Not Interested', 'Won', or 'Lost' are exempt.",
      path: ['nextFollowup']
    }
  );

type LogActivityValues = z.infer<typeof logActivitySchema>;

// ── Helpers ─────────────────────────────────────────────────────────────────

function minDateTimeLocal(): string {
  // Returns current datetime in 'YYYY-MM-DDTHH:MM' format for min attribute
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

// ── Component ────────────────────────────────────────────────────────────────

interface Props {
  opportunityId: string;
  currentStage?: string;
}

export default function LogActivityForm({ opportunityId, currentStage }: Props) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<LogActivityValues>({
    resolver: zodResolver(logActivitySchema),
    defaultValues: {
      channel: 'call',
      outcome: 'connected',
      notes: '',
      stage: (currentStage as any) ?? 'contacted',
      nextFollowup: { dueAt: '', purpose: '' }
    }
  });

  const watchedOutcome = watch('outcome');
  const watchedStage   = watch('stage');

  // Is this a "closed" interaction — no follow-up needed?
  const isClosed =
    watchedOutcome === 'not_interested' ||
    watchedStage === 'won' ||
    watchedStage === 'lost';

  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [errorMsg,   setErrorMsg]   = React.useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (values: LogActivityValues) => logActivity(opportunityId, values),
    onSuccess: (data) => {
      setErrorMsg(null);
      const newStage = data.opportunity?.stage;
      setSuccessMsg(
        `Activity logged${newStage ? ` — stage updated to "${newStage.replace('_', ' ')}"` : ''}.`
      );
      // Refresh both the timeline and the opportunity header
      queryClient.invalidateQueries({ queryKey: ['activities', opportunityId] });
      queryClient.invalidateQueries({ queryKey: ['opportunity', opportunityId] });
      reset();
    },
    onError: (err: any) => {
      setSuccessMsg(null);
      const msg =
        err.response?.data?.errors?.[0]?.message ||
        err.response?.data?.message ||
        'Failed to log activity. Please try again.';
      setErrorMsg(msg);
    }
  });

  const onSubmit = (values: LogActivityValues) => {
    // Strip nextFollowup from payload if closed — backend ignores it but let's be clean
    const payload = { ...values };
    if (isClosed) {
      delete payload.nextFollowup;
    }
    mutation.mutate(payload);
  };

  return (
    <div className="space-y-4">
      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
          ✓ {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
          ⚠️ {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* Row 1: Channel + Outcome */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="channel">Contact Channel</Label>
            <select
              id="channel"
              {...register('channel')}
              className="flex h-11 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
            >
              <option value="call">📞 Phone Call</option>
              <option value="whatsapp">💬 WhatsApp</option>
              <option value="email">📧 Email</option>
              <option value="meeting">🤝 Meeting</option>
              <option value="note">📝 Internal Note</option>
            </select>
            {errors.channel && <p className="text-xs text-red-400">{errors.channel.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="outcome">Outcome</Label>
            <select
              id="outcome"
              {...register('outcome')}
              className="flex h-11 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
            >
              <option value="connected">✅ Connected</option>
              <option value="no_answer">📵 No Answer</option>
              <option value="busy">⏸️ Busy</option>
              <option value="switched_off">🔇 Switched Off</option>
              <option value="wrong_number">❌ Wrong Number</option>
              <option value="interested">⭐ Interested</option>
              <option value="not_interested">🚫 Not Interested</option>
            </select>
            {errors.outcome && <p className="text-xs text-red-400">{errors.outcome.message}</p>}
          </div>
        </div>

        {/* Stage update (optional) */}
        <div className="space-y-2">
          <Label htmlFor="stage">
            Update Stage{' '}
            <span className="text-slate-500 font-normal text-[11px] ml-1">(optional)</span>
          </Label>
          <select
            id="stage"
            {...register('stage')}
            className="flex h-11 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
          >
            <option value="">— Keep current stage —</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="site_visit">Site Visit</option>
            <option value="negotiation">Negotiation</option>
            <option value="nurture">Nurture</option>
            <option value="won">Won 🏆</option>
            <option value="lost">Lost</option>
          </select>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            placeholder="What happened? Any key details from this interaction..."
            {...register('notes')}
          />
        </div>

        {/* ── Next Action Rule ─────────────────────────────────────────── */}
        {/* Show ONLY when the outcome is not a closed state */}
        {!isClosed ? (
          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-indigo-400 text-lg">📅</span>
              <div>
                <p className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                  Next Action Required
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Schedule a follow-up to keep this lead active. Mandatory for non-closed outcomes.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dueAt">Follow-up Date & Time <span className="text-red-400">*</span></Label>
                <input
                  id="dueAt"
                  type="datetime-local"
                  min={minDateTimeLocal()}
                  {...register('nextFollowup.dueAt')}
                  className="flex h-11 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none [color-scheme:dark]"
                />
                {errors.nextFollowup?.dueAt && (
                  <p className="text-xs text-red-400">{errors.nextFollowup.dueAt.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="purpose">
                  Purpose{' '}
                  <span className="text-slate-500 font-normal text-[11px]">(optional)</span>
                </Label>
                <input
                  id="purpose"
                  type="text"
                  placeholder="e.g. Send site visit details"
                  {...register('nextFollowup.purpose')}
                  className="flex h-11 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Top-level refine error (shown when dueAt omitted on submit) */}
            {errors.nextFollowup && !errors.nextFollowup.dueAt && (
              <p className="text-xs text-red-400 mt-1">
                ⚠️ {(errors.nextFollowup as any).message}
              </p>
            )}
          </div>
        ) : (
          /* Closed state indicator */
          <div className="rounded-2xl border border-slate-700/40 bg-slate-800/30 px-4 py-3 flex items-center gap-3">
            <span className="text-slate-400 text-base">✓</span>
            <p className="text-xs text-slate-400">
              No follow-up required — this outcome closes the active action window.
            </p>
          </div>
        )}

        <Button
          type="submit"
          disabled={isSubmitting || mutation.isPending}
          className="w-full"
        >
          {mutation.isPending ? 'Saving Activity...' : 'Log Activity'}
        </Button>
      </form>
    </div>
  );
}
