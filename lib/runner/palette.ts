export type PaletteState = 'unvisited' | 'skipped' | 'answered' | 'marked' | 'answered-marked' | 'correct' | 'wrong'

export type PaletteInput = {
  visited: boolean
  selected: string | null
  marked: boolean
  result: { is_correct: boolean } | null
}

/** The state of one numbered pill in the question palette. A checked result wins over everything. */
export function paletteState(q: PaletteInput): PaletteState {
  if (q.result) return q.result.is_correct ? 'correct' : 'wrong'
  if (q.selected && q.marked) return 'answered-marked'
  if (q.selected) return 'answered'
  if (q.marked) return 'marked'
  return q.visited ? 'skipped' : 'unvisited'
}

/** Counts for the legend under the palette. */
export function paletteCounts(qs: Pick<PaletteInput, 'selected' | 'marked'>[]) {
  const answered = qs.filter((q) => q.selected).length
  return { answered, marked: qs.filter((q) => q.marked).length, unanswered: qs.length - answered }
}
