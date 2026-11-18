import { z } from 'zod';

export const PASSWORD_RULES = [
  { id: 'len', label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { id: 'upper', label: 'One upper-case letter', test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'One lower-case letter', test: (p: string) => /[a-z]/.test(p) },
  { id: 'num', label: 'One number', test: (p: string) => /\d/.test(p) },
  { id: 'special', label: 'One special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export const strongPassword = z
  .string()
  .max(128, 'Password is too long.')
  .refine((p) => PASSWORD_RULES.every((r) => r.test(p)), 'Password does not meet all the requirements below.');

export const newPasswordSchema = z
  .object({ password: strongPassword, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: 'Passwords do not match.', path: ['confirm'] });
