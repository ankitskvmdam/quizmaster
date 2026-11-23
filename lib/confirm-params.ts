import type { EmailOtpType } from '@supabase/supabase-js'
import { safeNext } from '@/lib/safe-next'

const OTP_TYPES: EmailOtpType[] = ['signup', 'email', 'recovery', 'invite', 'magiclink', 'email_change']

/** Links that leave the person without a password they know: send them to choose one. */
const SET_PASSWORD_TYPES = new Set<string>(['recovery', 'invite'])

export type ConfirmParams =
  | { kind: 'otp'; tokenHash: string; type: EmailOtpType; next: string }
  | { kind: 'code'; code: string; next: string }
  | { kind: 'none'; next: string }

/** `next` may sit directly on the URL or inside a redirect_to that a template passed through. */
function readNext(sp: URLSearchParams): string | null {
  const direct = sp.get('next')
  if (direct) return direct
  const redirectTo = sp.get('redirect_to')
  if (!redirectTo) return null
  try {
    return new URL(redirectTo, 'http://same.invalid').searchParams.get('next')
  } catch {
    return null
  }
}

/** Where a link of this type should land: recovery and invite links go to choose a password. */
export function destinationFor(type: string | null, next: string | null): string {
  if (type && SET_PASSWORD_TYPES.has(type)) return '/reset-password'
  return safeNext(next)
}

/**
 * Email links arrive in several shapes, depending on the template variables used:
 *  - token_hash + type ({{ .TokenHash }}, our templates)
 *  - code ({{ .ConfirmationURL }} with PKCE: Supabase verifies, then redirects back with a code)
 *  - Supabase's error redirect (error / error_code) or nothing usable: kind 'none'
 */
export function readConfirmParams(sp: URLSearchParams): ConfirmParams {
  const type = sp.get('type')
  const next = destinationFor(type, readNext(sp))
  const tokenHash = sp.get('token_hash')
  if (tokenHash && type && (OTP_TYPES as string[]).includes(type)) {
    return { kind: 'otp', tokenHash, type: type as EmailOtpType, next }
  }
  const code = sp.get('code')
  if (code) return { kind: 'code', code, next }
  return { kind: 'none', next }
}
