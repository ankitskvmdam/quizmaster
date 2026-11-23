import { describe, expect, it } from 'vitest'
import { firstName } from '@/lib/names'
import { nameSchema } from '@/lib/validation'

describe('firstName', () => {
  it('takes the first word of the display name', () => {
    expect(firstName('Asha Verma')).toBe('Asha')
  })
  it('copes with extra spaces and tabs', () => {
    expect(firstName('   Ravi\t Kumar  Singh ')).toBe('Ravi')
  })
  it('keeps a single name as it is', () => {
    expect(firstName('Priya')).toBe('Priya')
  })
  it('falls back when the name is blank', () => {
    expect(firstName('   ')).toBe('there')
  })
})

describe('nameSchema', () => {
  it('trims and collapses inner spaces', () => {
    expect(nameSchema.parse('  Asha   Verma ')).toBe('Asha Verma')
  })
  it('requires a name', () => {
    expect(nameSchema.safeParse('   ').success).toBe(false)
  })
  it('caps the length at 60 characters', () => {
    expect(nameSchema.safeParse('a'.repeat(61)).success).toBe(false)
    expect(nameSchema.safeParse('a'.repeat(60)).success).toBe(true)
  })
})
