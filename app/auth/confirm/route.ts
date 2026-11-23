import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { readConfirmParams } from '@/lib/confirm-params'

/**
 * Email links land here. Verify the one-time token (our templates) or exchange the code (Supabase's default
 * templates); either signs the person in. If neither works the email is usually already confirmed (an email
 * scanner may have opened the link first), so send them to sign in with a gentle note, not an error.
 */
export async function GET(request: NextRequest) {
  const p = readConfirmParams(request.nextUrl.searchParams)
  const supabase = await createClient()

  if (p.kind === 'otp') {
    const { error } = await supabase.auth.verifyOtp({ type: p.type, token_hash: p.tokenHash })
    if (!error) return NextResponse.redirect(new URL(p.next, request.url))
  } else if (p.kind === 'code') {
    const { error } = await supabase.auth.exchangeCodeForSession(p.code)
    if (!error) return NextResponse.redirect(new URL(p.next, request.url))
  }

  const isReset = p.next === '/reset-password'
  return NextResponse.redirect(new URL(isReset ? '/login?error=link' : '/login?notice=confirmed', request.url))
}
