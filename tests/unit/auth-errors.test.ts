import { describe, expect, it } from 'vitest'
import { mapSignUpError, NOT_INVITED_MESSAGE } from '@/lib/auth-errors'

describe('mapSignUpError', () => {
  it('puts the allowlist rejection on the email field with the exact copy', () => {
    expect(mapSignUpError({ status: 403, message: 'whatever' })).toEqual({
      field: 'email',
      message: "This email hasn't been invited yet. Ask the person who shared this link to add you.",
    })
    expect(NOT_INVITED_MESSAGE).toBe("This email hasn't been invited yet. Ask the person who shared this link to add you.")
  })
  it('recognises the hook message even without a status', () => {
    expect(mapSignUpError({ message: "This email hasn't been invited yet." }).field).toBe('email')
  })
  it('puts password problems on the password field', () => {
    expect(mapSignUpError({ message: 'Password should be at least 8 characters' }).field).toBe('password')
  })
  it('falls back to a general message', () => {
    expect(mapSignUpError({ status: 500, message: 'boom' })).toEqual({
      field: null,
      message: 'Something went wrong. Try again.',
    })
  })
})
