import { describe, expect, it } from 'vitest'
import { materialCounts, toBookKind } from '@/lib/courses/counts'

describe('materialCounts', () => {
  it('names each kind of material and uses the singular for one', () => {
    expect(materialCounts({ shortNotes: 1, bookKinds: ['book', 'topic', 'topic'] })).toEqual([
      { n: 1, label: 'book summary' },
      { n: 2, label: 'topics' },
      { n: 1, label: 'short note' },
    ])
  })

  it('calls current-affairs books months and leaves out what there is none of', () => {
    expect(materialCounts({ shortNotes: 0, bookKinds: ['monthly', 'monthly'] })).toEqual([{ n: 2, label: 'months' }])
    expect(materialCounts({ shortNotes: 0, bookKinds: [] })).toEqual([])
  })

  it('treats an unknown kind as a book', () => {
    expect(toBookKind('monthly')).toBe('monthly')
    expect(toBookKind('something-else')).toBe('book')
  })
})
