const { z } = require('zod');

const logActivitySchema = z
  .object({
    channel: z.enum(['call', 'whatsapp', 'email', 'meeting', 'note'], {
      required_error: 'Channel is required'
    }),
    outcome: z.enum(
      [
        // Legacy values
        'connected',
        'no_answer',
        'busy',
        'wrong_number',
        'interested',
        'not_interested',
        // Realigned values (current standard)
        'not_done',
        'didnt_pick',
        'not_incoming',
        'done',
        'callback_needed',
        'switched_off'
      ],
      { required_error: 'Outcome is required' }
    ),
    notes: z.string().optional(),
    stage: z
      .enum([
        'new',
        'contacted',
        'qualified',
        'site_visit',
        'negotiation',
        'nurture',
        'won',
        'lost'
      ])
      .optional(),
    nextFollowup: z
      .object({
        dueAt: z.union([z.string(), z.date()]),
        purpose: z.string().optional()
      })
      .optional()
  })
  .refine(
    (data) => {
      const CLOSING_OUTCOMES = ['not_interested', 'not_done'];
      const isClosed =
        CLOSING_OUTCOMES.includes(data.outcome) ||
        data.stage === 'won' ||
        data.stage === 'lost';

      if (isClosed) {
        return true;
      }

      // Next action rule: nextFollowup with dueAt is required for active opportunities
      return (
        data.nextFollowup &&
        data.nextFollowup.dueAt &&
        String(data.nextFollowup.dueAt).trim() !== ''
      );
    },
    {
      message:
        "Next follow-up date (nextFollowup.dueAt) is required unless outcome is 'not_interested'/'not_done' or stage is 'won'/'lost'",
      path: ['nextFollowup']
    }
  );

module.exports = {
  logActivitySchema
};
