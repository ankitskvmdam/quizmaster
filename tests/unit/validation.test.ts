import { describe, expect, it } from 'vitest'
import { emailSchema, passwordRules, passwordSchema } from '@/lib/validation'

describe('passwordSchema', () => {
  it('accepts 8+ characters with a letter and a number', () => {
    expect(passwordSchema.safeParse('abcdefg1').success).toBe(true)
  })
  it('rejects a password with no number', () => {
    expect(passwordSchema.safeParse('abcdefgh').success).toBe(false)
  })
  it('rejects a password shorter than 8 characters', () => {
    expect(passwordSchema.safeParse('abcdef1').success).toBe(false)
  })
  it('rejects a password with no letter', () => {
    expect(passwordSchema.safeParse('12345678').success).toBe(false)
  })
})

describe('passwordRules', () => {
  it('ticks each rule independently', () => {
    expect(passwordRules.map((r) => r.test('a1'))).toEqual([false, true, true])
    expect(passwordRules.map((r) => r.label)).toEqual(['At least 8 characters', 'A letter', 'A number'])
  })
})

describe('emailSchema', () => {
  it('trims and lower-cases', () => {
    expect(emailSchema.parse('  Asha@Mail.COM ')).toBe('asha@mail.com')
  })
  it('rejects a non-email', () => {
    expect(emailSchema.safeParse('asha').success).toBe(false)
  })
})
