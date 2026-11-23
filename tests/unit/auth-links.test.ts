import { describe, expect, it } from 'vitest'
import { readConfirmParams } from '@/lib/confirm-params'
import { forwardToConfirm, parseAuthHash } from '@/lib/auth-links'

const sp = (q: string) => new URLSearchParams(q)

describe('readConfirmParams: where each link type should land', () => {
  it('sends a password-reset link to choose a new password even without next', () => {
    expect(readConfirmParams(sp('token_hash=a&type=recovery')).next).toBe('/reset-password')
  })
  it('sends a dashboard invite to choose a password (invited users have none yet)', () => {
    expect(readConfirmParams(sp('token_hash=a&type=invite&next=/study')).next).toBe('/reset-password')
  })
  it('keeps next for sign-up, magic link and email change', () => {
    expect(readConfirmParams(sp('token_hash=a&type=signup&next=/tests')).next).toBe('/tests')
    expect(readConfirmParams(sp('token_hash=a&type=magiclink')).next).toBe('/study')
    expect(readConfirmParams(sp('token_hash=a&type=email_change')).next).toBe('/study')
  })
  it('reads the redirect_to that some templates put next inside', () => {
    expect(readConfirmParams(sp('code=c&redirect_to=' + encodeURIComponent('https://x.app/auth/confirm?next=/past'))).next).toBe('/past')
  })
})

describe('forwardToConfirm: auth params that landed on another page', () => {
  it('forwards a code that landed on the Site URL root', () => {
    expect(forwardToConfirm('/', sp('code=abc'))).toBe('/auth/confirm?code=abc')
  })
  it('forwards token_hash links on any page, keeping every param', () => {
    expect(forwardToConfirm('/login', sp('token_hash=t&type=recovery'))).toBe('/auth/confirm?token_hash=t&type=recovery')
  })
  it("forwards Supabase's error redirect so it gets the friendly note", () => {
    expect(forwardToConfirm('/', sp('error=access_denied&error_code=otp_expired'))).toBe(
      '/auth/confirm?error=access_denied&error_code=otp_expired',
    )
  })
  it('leaves our own ?error=link and normal pages alone', () => {
    expect(forwardToConfirm('/login', sp('error=link'))).toBeNull()
    expect(forwardToConfirm('/past', sp('page=2'))).toBeNull()
  })
  it('never loops on /auth/confirm itself', () => {
    expect(forwardToConfirm('/auth/confirm', sp('code=abc'))).toBeNull()
  })
})

describe('parseAuthHash: tokens that arrive in the URL hash', () => {
  it('reads a session and sends a recovery to choose a new password', () => {
    expect(parseAuthHash('#access_token=A&refresh_token=R&type=recovery&expires_in=3600')).toEqual({
      kind: 'session', accessToken: 'A', refreshToken: 'R', next: '/reset-password',
    })
  })
  it('reads a sign-up session and sends it to Study', () => {
    expect(parseAuthHash('#access_token=A&refresh_token=R&type=signup')).toEqual({
      kind: 'session', accessToken: 'A', refreshToken: 'R', next: '/study',
    })
  })
  it('reads an error in the hash', () => {
    expect(parseAuthHash('#error=access_denied&error_code=otp_expired&error_description=x')).toEqual({ kind: 'error' })
  })
  it('ignores ordinary hashes', () => {
    expect(parseAuthHash('#mine')).toBeNull()
    expect(parseAuthHash('')).toBeNull()
  })
})
