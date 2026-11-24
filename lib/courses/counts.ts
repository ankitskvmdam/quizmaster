import type { BookKind } from './tree'

export type Count = { n: number; label: string }

const one = (n: number, singular: string, plural: string): Count => ({ n, label: n === 1 ? singular : plural })

/**
 * What a card says a course or subject holds, in the app's own names ("2 book summaries", "10 months"), leaving out
 * anything there is none of.
 */
export function materialCounts({ shortNotes, bookKinds }: { shortNotes: number; bookKinds: BookKind[] }): Count[] {
  const of = (kind: BookKind) => bookKinds.filter((k) => k === kind).length
  return [
    one(of('monthly'), 'month', 'months'),
    one(of('book'), 'book summary', 'book summaries'),
    one(of('topic'), 'topic', 'topics'),
    one(shortNotes, 'short note', 'short notes'),
  ].filter((c) => c.n > 0)
}

export const toBookKind = (kind: string): BookKind => (kind === 'topic' || kind === 'monthly' ? kind : 'book')
