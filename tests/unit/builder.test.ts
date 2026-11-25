import { describe, expect, it } from 'vitest'
import { defaultMinutes, parseBuiltTest, splitCount } from '@/lib/builder'

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

describe('parseBuiltTest', () => {
  const sections = (v: unknown) => ['sections', JSON.stringify(v)] as [string, string]
  it('reads sections, count, mode, minutes and name', () => {
    const r = parseBuiltTest(form([sections([['a', 'b', 'a'], ['c']]), ['count', '37'], ['mode', 'timed'], ['minutes', '45'], ['title', '  Mix  ']]))
    expect(r).toEqual({ ok: true, value: { sections: [['a', 'b'], ['c']], count: 37, mode: 'timed', durationSec: 2700, title: 'Mix' } })
  })
  it('has no time limit in practice mode and no name when left blank', () => {
    const r = parseBuiltTest(form([sections([['a']]), ['count', '10'], ['mode', 'practice'], ['minutes', '5'], ['title', ' ']]))
    expect(r).toEqual({ ok: true, value: { sections: [['a']], count: 10, mode: 'practice', durationSec: null, title: null } })
  })
  it('needs a topic in every section, at most ten sections, and 5 to 150 questions', () => {
    expect(parseBuiltTest(form([sections([['a'], []]), ['count', '10']]))).toEqual({ ok: false, error: 'Pick at least one topic in section 2, or remove it.' })
    expect(parseBuiltTest(form([sections(Array.from({ length: 11 }, () => ['a'])), ['count', '10']])).ok).toBe(false)
    expect(parseBuiltTest(form([sections([['a']]), ['count', '4']])).ok).toBe(false)
    expect(parseBuiltTest(form([sections([['a']]), ['count', '151']])).ok).toBe(false)
  })
})

describe('splitCount', () => {
  it('splits evenly, the first sections taking the remainder', () => {
    expect(splitCount(20, [100, 100, 100])).toEqual([7, 7, 6])
  })
  it("passes a small section's spare share to the others", () => {
    expect(splitCount(10, [20, 3])).toEqual([7, 3])
  })
  it('stops at what the sections have', () => {
    expect(splitCount(50, [4, 6])).toEqual([4, 6])
  })
})
