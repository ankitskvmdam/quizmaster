'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { siteUrl } from '@/lib/supabase/env'
import { emailSchema, passwordSchema } from '@/lib/validation'
import { mapSignUpError } from '@/lib/auth-errors'
import { safeNext } from '@/lib/safe-next'

export type AuthState =
  | null
  | { ok: true; sentTo?: string }
  | { ok: false; field: 'email' | 'password' | null; message: string }

const confirmUrl = (next: string) => `${siteUrl()}/auth/confirm?next=${encodeURIComponent(next)}`

function readEmail(formData: FormData) {
  return emailSchema.safeParse(formData.get('email') ?? '')
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = readEmail(formData)
  const password = String(formData.get('password') ?? '')
  if (!email.success) return { ok: false, field: 'email', message: 'Enter a valid email address.' }
  if (!password) return { ok: false, field: 'password', message: 'Enter your password.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email: email.data, password })
  if (error) {
    if (error.code === 'email_not_confirmed') {
      return { ok: false, field: null, message: 'Confirm your email first. The link is in your inbox.' }
    }
    return { ok: false, field: null, message: 'Email or password is incorrect.' }
  }
  redirect(safeNext(formData.get('next')))
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = readEmail(formData)
  if (!email.success) return { ok: false, field: 'email', message: 'Enter a valid email address.' }
  const password = passwordSchema.safeParse(String(formData.get('password') ?? ''))
  if (!password.success) {
    return { ok: false, field: 'password', message: 'Use at least 8 characters, with a letter and a number.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: email.data,
    password: password.data,
    options: { emailRedirectTo: confirmUrl('/study') },
  })
  if (error) return { ok: false, ...mapSignUpError(error) }
  return { ok: true, sentTo: email.data }
}

export async function resendConfirmation(email: string): Promise<AuthState> {
  const parsed = emailSchema.safeParse(email)
  if (!parsed.success) return { ok: false, field: 'email', message: 'Enter a valid email address.' }
  const supabase = await createClient()
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: parsed.data,
    options: { emailRedirectTo: confirmUrl('/study') },
  })
  if (error) return { ok: false, field: null, message: 'Could not resend just now. Try again in a minute.' }
  return { ok: true, sentTo: parsed.data }
}

export async function requestReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = readEmail(formData)
  if (!email.success) return { ok: false, field: 'email', message: 'Enter a valid email address.' }
  const supabase = await createClient()
  // Same answer whether or not the account exists, so this form cannot be used to probe for accounts.
  await supabase.auth.resetPasswordForEmail(email.data, { redirectTo: confirmUrl('/reset-password') })
  return { ok: true, sentTo: email.data }
}

export async function updatePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const password = passwordSchema.safeParse(String(formData.get('password') ?? ''))
  if (!password.success) {
    return { ok: false, field: 'password', message: 'Use at least 8 characters, with a letter and a number.' }
  }
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims?.sub) {
    return { ok: false, field: null, message: 'This reset link has expired. Ask for a new one.' }
  }
  const { error } = await supabase.auth.updateUser({ password: password.data })
  if (error) return { ok: false, ...mapSignUpError(error) }
  redirect('/study')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
