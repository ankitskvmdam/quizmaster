import type { EmailOtpType } from '@supabase/supabase-js'
import { safeNext } from '@/lib/safe-next'

const OTP_TYPES: EmailOtpType[] = ['signup', 'email', 'recovery', 'invite', 'magiclink', 'email_change']

export type ConfirmParams =
  | { kind: 'otp'; tokenHash: string; type: EmailOtpType; next: string }
  | { kind: 'code'; code: string; next: string }
  | { kind: 'none'; next: string }

/**
 * Email links arrive in two shapes: our templates send token_hash + type; Supabase's default templates verify on
 * Supabase's side and come back with a PKCE `code`. Anything else (including Supabase's own error redirect) is none.
 */
export function readConfirmParams(sp: URLSearchParams): ConfirmParams {
  const next = safeNext(sp.get('next'))
  const tokenHash = sp.get('token_hash')
  const type = sp.get('type') as EmailOtpType | null
  if (tokenHash && type && OTP_TYPES.includes(type)) return { kind: 'otp', tokenHash, type, next }
  const code = sp.get('code')
  if (code) return { kind: 'code', code, next }
  return { kind: 'none', next }
}
