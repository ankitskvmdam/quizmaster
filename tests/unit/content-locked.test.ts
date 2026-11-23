import { describe, expect, it } from 'vitest'
import { lockedTestChanges } from '@/lib/content/plan'

const t = (slug: string, questionSlugs: string[], title = 'T') => ({ slug, title, questionSlugs })

describe('lockedTestChanges', () => {
  const existing = [t('mock-1', ['a', 'b']), t('mock-2', ['c'])]
  it('flags a test with attempts whose question list changes', () => {
    expect(lockedTestChanges(existing, [t('mock-1', ['a', 'b', 'x'])], new Set(['mock-1']))).toEqual(['mock-1'])
  })
  it('flags a reorder too, because reviews show questions in test order', () => {
    expect(lockedTestChanges(existing, [t('mock-1', ['b', 'a'])], new Set(['mock-1']))).toEqual(['mock-1'])
  })
  it('allows other edits (title, marks) to an attempted test', () => {
    expect(lockedTestChanges(existing, [t('mock-1', ['a', 'b'], 'Renamed')], new Set(['mock-1']))).toEqual([])
  })
  it('allows any change to a test nobody has attempted', () => {
    expect(lockedTestChanges(existing, [t('mock-2', ['c', 'd'])], new Set(['mock-1']))).toEqual([])
  })
})
