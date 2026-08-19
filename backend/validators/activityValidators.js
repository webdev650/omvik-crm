const { z } = require('zod');

const logActivitySchema = z
  .object({
    channel: z.enum(['call', 'whatsapp', 'email', 'meeting', 'note'], {
      required_error: 'Channel is required'
    }),
    outcome: z.enum(
      [
        'connected',
        'no_answer',
        'busy',
        'switched_off',
        'wrong_number',
        'interested',
        'not_interested'
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
      const isClosed =
        data.outcome === 'not_interested' ||
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
        "Next follow-up date (nextFollowup.dueAt) is required unless outcome is 'not_interested' or stage is 'won'/'lost'",
      path: ['nextFollowup']
    }
  );

module.exports = {
  logActivitySchema
};
