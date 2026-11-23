import { describe, expect, it } from 'vitest'
import { defaultMinutes, parseBuilder } from '@/lib/builder'

const form = (entries: [string, string][]) => {
  const f = new FormData()
  for (const [k, v] of entries) f.append(k, v)
  return f
}

describe('defaultMinutes', () => {
  it('gives 1.2 minutes a question, rounded up', () => {
    expect(defaultMinutes(10)).toBe(12)
    expect(defaultMinutes(20)).toBe(24)
    expect(defaultMinutes(30)).toBe(36)
  })
})

describe('parseBuilder', () => {
  it('reads topics, count, mode and minutes', () => {
    const r = parseBuilder(form([['topic', 't1'], ['topic', 't2'], ['count', '20'], ['mode', 'timed'], ['minutes', '25']]))
    expect(r).toEqual({ ok: true, value: { topicIds: ['t1', 't2'], count: 20, mode: 'timed', durationSec: 1500 } })
  })
  it('has no time limit in practice mode', () => {
    const r = parseBuilder(form([['topic', 't1'], ['count', '10'], ['mode', 'practice'], ['minutes', '25']]))
    expect(r).toEqual({ ok: true, value: { topicIds: ['t1'], count: 10, mode: 'practice', durationSec: null } })
  })
  it('needs at least one topic', () => {
    expect(parseBuilder(form([['count', '10'], ['mode', 'practice']]))).toEqual({ ok: false, error: 'Pick at least one topic.' })
  })
  it('only allows 10, 20 or 30 questions', () => {
    expect(parseBuilder(form([['topic', 't1'], ['count', '15'], ['mode', 'practice']])).ok).toBe(false)
  })
  it('needs a sensible time limit for a timed test', () => {
    expect(parseBuilder(form([['topic', 't1'], ['count', '10'], ['mode', 'timed'], ['minutes', '0']]))).toEqual({
      ok: false,
      error: 'Set a time limit between 1 and 180 minutes.',
    })
  })
})
