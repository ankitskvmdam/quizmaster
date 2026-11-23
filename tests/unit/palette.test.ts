import { describe, expect, it } from 'vitest'
import { paletteCounts, paletteState } from '@/lib/runner/palette'

const q = (over: Partial<Parameters<typeof paletteState>[0]> = {}) => ({
  visited: false,
  selected: null,
  marked: false,
  result: null,
  ...over,
})

describe('paletteState', () => {
  it('is unvisited before the question is seen', () => {
    expect(paletteState(q())).toBe('unvisited')
  })
  it('is skipped once seen without an answer', () => {
    expect(paletteState(q({ visited: true }))).toBe('skipped')
  })
  it('is answered when an option is chosen', () => {
    expect(paletteState(q({ visited: true, selected: 'B' }))).toBe('answered')
  })
  it('is marked when flagged for review without an answer', () => {
    expect(paletteState(q({ visited: true, marked: true }))).toBe('marked')
  })
  it('is answered-marked when both', () => {
    expect(paletteState(q({ visited: true, selected: 'B', marked: true }))).toBe('answered-marked')
  })
  it('shows the result of a checked practice question first', () => {
    expect(paletteState(q({ visited: true, selected: 'B', marked: true, result: { is_correct: false } }))).toBe('wrong')
    expect(paletteState(q({ visited: true, selected: 'A', result: { is_correct: true } }))).toBe('correct')
  })
})

describe('paletteCounts', () => {
  it('counts answered, marked and not answered for the legend', () => {
    expect(
      paletteCounts([
        q({ selected: 'A' }),
        q({ selected: 'B', marked: true }),
        q({ marked: true }),
        q(),
      ]),
    ).toEqual({ answered: 2, marked: 2, unanswered: 2 })
  })
})
