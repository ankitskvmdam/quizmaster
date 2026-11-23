import { describe, expect, it } from 'vitest'
import { filterReview, type ReviewQuestion } from '@/lib/runner/types'

const q = (id: string, selected: string | null, correct: boolean, marked = false): ReviewQuestion => ({
  id,
  position: 1,
  topic_name: 'T',
  stem_md: '',
  options: [],
  selected_key: selected,
  marked,
  correct_key: 'A',
  explanation_md: '',
  is_correct: correct,
})

const qs = [q('right', 'A', true), q('wrong', 'B', false, true), q('skipped', null, false), q('skipped-marked', null, false, true)]

describe('filterReview', () => {
  it('keeps everything for all', () => {
    expect(filterReview(qs, 'all').map((x) => x.id)).toEqual(['right', 'wrong', 'skipped', 'skipped-marked'])
  })
  it('wrong means answered and not correct, never skipped', () => {
    expect(filterReview(qs, 'wrong').map((x) => x.id)).toEqual(['wrong'])
  })
  it('skipped means no answer', () => {
    expect(filterReview(qs, 'skipped').map((x) => x.id)).toEqual(['skipped', 'skipped-marked'])
  })
  it('marked means flagged for review', () => {
    expect(filterReview(qs, 'marked').map((x) => x.id)).toEqual(['wrong', 'skipped-marked'])
  })
})
