import { describe, expect, it } from 'vitest'
import { selectAll } from '@/lib/content/select-all'

const rows = Array.from({ length: 2500 }, (_, i) => ({ id: i }))
const fakePage = (calls: [number, number][]) => async (from: number, to: number) => {
  calls.push([from, to])
  return { data: rows.slice(from, to + 1), error: null }
}

describe('selectAll', () => {
  it('reads every page past the API row limit', async () => {
    const calls: [number, number][] = []
    const all = await selectAll(fakePage(calls), 'rows', 1000)
    expect(all).toHaveLength(2500)
    expect(all[2499]).toEqual({ id: 2499 })
    expect(calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]])
  })
  it('stops after one call when the first page is short', async () => {
    const calls: [number, number][] = []
    const all = await selectAll(async (from, to) => (calls.push([from, to]), { data: [{ id: 1 }], error: null }), 'rows')
    expect(all).toEqual([{ id: 1 }])
    expect(calls).toHaveLength(1)
  })
  it('names what failed', async () => {
    await expect(selectAll(async () => ({ data: null, error: { message: 'boom' } }), 'read questions')).rejects.toThrow(
      'read questions: boom',
    )
  })
})
