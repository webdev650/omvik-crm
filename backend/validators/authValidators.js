const { z } = require('zod');

// Password Complexity Rule:
// Min 7 chars, at least 1 uppercase (A-Z), 1 lowercase (a-z), 1 number (0-9), 1 special char (@, #, $, %, !, etc.)
const passwordComplexitySchema = z.string()
  .min(7, 'Password must be at least 7 characters')
  .regex(/[A-Z]/, 'Password must contain at least 1 uppercase letter (A-Z)')
  .regex(/[a-z]/, 'Password must contain at least 1 lowercase letter (a-z)')
  .regex(/[0-9]/, 'Password must contain at least 1 number (0-9)')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least 1 special character (e.g. @, #, $, %, !)');

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: passwordComplexitySchema,
  role: z
    .enum([
      'super_admin',
      'director',
      'admin',
      'team_lead',
      'telecaller',
      'marketing',
      'finance'
    ])
    .optional(),
  teamId: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required')
});

module.exports = {
  registerSchema,
  loginSchema,
  passwordComplexitySchema
};
