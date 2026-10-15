const { z } = require('zod');

const publicLeadSchema = z.object({
  rawName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  rawMobile: z.string().min(10, 'Mobile number must be at least 10 digits').max(16),
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
    return res.status(400).json({
      message: 'Validation failed',
      errors: result.error.issues ? result.error.issues.map(e => ({ field: e.path.join('.'), message: e.message })) : []
    });
  }
  next();
};

module.exports = { validatePublicLead, publicLeadSchema };
