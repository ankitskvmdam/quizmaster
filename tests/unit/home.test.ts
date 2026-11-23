import { describe, expect, it } from 'vitest'
import { greeting, isNewItem, nextCaCategory, nextLesson, type LessonRef } from '@/lib/home'

describe('greeting', () => {
  it('follows the local hour', () => {
    expect(greeting(6)).toBe('Good morning')
    expect(greeting(11)).toBe('Good morning')
    expect(greeting(12)).toBe('Good afternoon')
    expect(greeting(16)).toBe('Good afternoon')
    expect(greeting(17)).toBe('Good evening')
    expect(greeting(2)).toBe('Good evening')
  })
})

const L = (id: string, topic: string, done = false): LessonRef => ({ id, topicId: topic, done })
// Ordered as shown: subject → topic → lesson position
const lessons = [L('a1', 'A', true), L('a2', 'A'), L('a3', 'A'), L('b1', 'B'), L('b2', 'B')]

describe('nextLesson', () => {
  it('starts with the first lesson when nothing is done', () => {
    expect(nextLesson(lessons.map((l) => ({ ...l, done: false })), null)?.id).toBe('a1')
  })
  it('continues in the topic of the most recently finished lesson', () => {
    const ls = [L('a1', 'A'), L('a2', 'A'), L('b1', 'B', true), L('b2', 'B')]
    expect(nextLesson(ls, 'b1')?.id).toBe('b2')
  })
  it('falls back to the first unfinished lesson anywhere when that topic is finished', () => {
    const ls = [L('a1', 'A'), L('b1', 'B', true), L('b2', 'B', true)]
    expect(nextLesson(ls, 'b2')?.id).toBe('a1')
  })
  it('returns null when every lesson is done', () => {
    expect(nextLesson([L('a1', 'A', true)], 'a1')).toBeNull()
  })
  it('skips done lessons inside the current topic', () => {
    expect(nextLesson(lessons, 'a1')?.id).toBe('a2')
  })
})

describe('isNewItem', () => {
  const now = Date.parse('2026-11-23T12:00:00Z')
  it('is new when published in the last 14 days and not yet seen', () => {
    expect(isNewItem('2026-11-20T00:00:00Z', false, now)).toBe(true)
  })
  it('is not new once seen', () => {
    expect(isNewItem('2026-11-20T00:00:00Z', true, now)).toBe(false)
  })
  it('is not new after 14 days', () => {
    expect(isNewItem('2026-11-08T00:00:00Z', false, now)).toBe(false)
  })
  it('is not new without a publish date', () => {
    expect(isNewItem(null, false, now)).toBe(false)
  })
})

describe('nextCaCategory', () => {
  const months = [
    { monthId: 'feb', month: '2099-02', categories: [{ slug: 'appointments', name: 'Appointments' }, { slug: 'sports', name: 'Sports' }] },
    { monthId: 'jan', month: '2099-01', categories: [{ slug: 'awards', name: 'Awards' }] },
  ]
  it('picks the first unread category of the newest month', () => {
    expect(nextCaCategory(months, new Set(['jan/awards', 'feb/appointments']))).toEqual({
      monthId: 'feb',
      month: '2099-02',
      category: { slug: 'sports', name: 'Sports' },
    })
  })
  it('stays quiet until the person has read something', () => {
    expect(nextCaCategory(months, new Set())).toBeNull()
  })
  it('stays quiet when the newest month is fully read', () => {
    expect(nextCaCategory(months, new Set(['feb/appointments', 'feb/sports']))).toBeNull()
  })
  it('stays quiet with no months', () => {
    expect(nextCaCategory([], new Set(['x/y']))).toBeNull()
  })
})
