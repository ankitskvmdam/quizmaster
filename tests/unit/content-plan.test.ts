import { describe, expect, it } from 'vitest'
import { planChanges } from '@/lib/content/plan'

type Row = { slug: string; v: number }
const key = (r: Row) => r.slug
const cmp = (r: Row) => r.v

describe('planChanges', () => {
  it('splits desired rows into create, update and unchanged, and reports missing existing rows', () => {
    const existing: Row[] = [
      { slug: 'a', v: 1 },
      { slug: 'b', v: 1 },
      { slug: 'z', v: 1 },
    ]
    const desired: Row[] = [
      { slug: 'a', v: 1 },
      { slug: 'b', v: 2 },
      { slug: 'c', v: 1 },
    ]
    const p = planChanges(existing, desired, key, cmp)
    expect(p.create.map(key)).toEqual(['c'])
    expect(p.update.map(key)).toEqual(['b'])
    expect(p.unchanged.map(key)).toEqual(['a'])
    expect(p.missing.map(key)).toEqual(['z'])
  })

  it('treats key order inside compared objects as irrelevant', () => {
    const p = planChanges(
      [{ slug: 'a', o: { x: 1, y: 2 } }],
      [{ slug: 'a', o: { y: 2, x: 1 } }],
      (r) => r.slug,
      (r) => r.o,
    )
    expect(p.unchanged).toHaveLength(1)
  })
})
