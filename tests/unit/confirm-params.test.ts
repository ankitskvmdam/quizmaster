import { describe, expect, it } from 'vitest'
import { readConfirmParams } from '@/lib/confirm-params'

const sp = (q: string) => new URLSearchParams(q)

describe('readConfirmParams', () => {
  it('reads our template link (token_hash + type)', () => {
    expect(readConfirmParams(sp('token_hash=abc&type=email&next=/study'))).toEqual({
      kind: 'otp', tokenHash: 'abc', type: 'email', next: '/study',
    })
  })
  it("reads Supabase's default template link, which comes back with a PKCE code", () => {
    expect(readConfirmParams(sp('code=xyz&next=%2Fstudy'))).toEqual({ kind: 'code', code: 'xyz', next: '/study' })
  })
  it('ignores an unknown type', () => {
    expect(readConfirmParams(sp('token_hash=abc&type=bogus'))).toEqual({ kind: 'none', next: '/study' })
  })
  it('never lets next leave the site', () => {
    expect(readConfirmParams(sp('code=xyz&next=//evil.com')).next).toBe('/study')
  })
  it('reports the error Supabase puts on the redirect when it already used the token', () => {
    expect(readConfirmParams(sp('error=access_denied&error_code=otp_expired'))).toEqual({ kind: 'none', next: '/study' })
  })
})
