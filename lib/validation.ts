import { z } from 'zod'

export type PasswordRule = { id: 'length' | 'letter' | 'number'; label: string; test: (p: string) => boolean }

/** The rules PasswordRules ticks off as you type. passwordSchema restates them. */
export const passwordRules: PasswordRule[] = [
  { id: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { id: 'letter', label: 'A letter', test: (p) => /[a-z]/i.test(p) },
  { id: 'number', label: 'A number', test: (p) => /\d/.test(p) },
]

export const passwordSchema = z
  .string()
  .refine((p) => passwordRules.every((r) => r.test(p)), {
    message: 'Use at least 8 characters, with a letter and a number.',
  })

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ message: 'Enter a valid email address.' }))

/** The name asked for at sign-up: trimmed, inner spaces collapsed, 1–60 characters. */
export const nameSchema = z
  .string()
  .transform((s) => s.trim().replace(/\s+/g, ' '))
  .pipe(z.string().min(1, 'Enter your name.').max(60, 'Use 60 characters or fewer.'))
