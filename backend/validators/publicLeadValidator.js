const { z } = require('zod');
const { isValidIndianMobile } = require('../utils/phoneValidator');

const publicLeadSchema = z.object({
  rawName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  rawMobile: z.string().superRefine((val, ctx) => {
    const res = isValidIndianMobile(val);
    if (!res.isValid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: res.reason || 'Invalid Indian mobile number'
      });
    }
  }),
  projectId: z.string().optional(),
  projectName: z.string().max(100).optional(),
  projectCode: z.string().max(50).optional(),
  source: z.string().max(50).optional(),
  campaign: z.string().max(100).optional(),
  email: z.string().email().optional().or(z.literal('')).or(z.null()),
  city: z.string().max(100).optional(),
  utm_source: z.string().max(100).optional(),
  utm_medium: z.string().max(100).optional(),
  utm_campaign: z.string().max(100).optional(),
  utm_content: z.string().max(100).optional(),
  utm_term: z.string().max(100).optional()
}).passthrough();

const validatePublicLead = (req, res, next) => {
  const result = publicLeadSchema.safeParse(req.body);
  if (!result.success) {
    const firstMsg = result.error.issues?.[0]?.message || 'Validation failed';
    return res.status(400).json({
      message: firstMsg,
      reason: firstMsg,
      errors: result.error.issues ? result.error.issues.map(e => ({ field: e.path.join('.'), message: e.message })) : []
    });
  }
  next();
};

module.exports = { validatePublicLead, publicLeadSchema };
