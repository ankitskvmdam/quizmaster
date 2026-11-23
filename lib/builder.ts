export const QUESTION_COUNTS = [10, 20, 30] as const

/** 1.2 minutes per question, rounded up. */
export function defaultMinutes(count: number) {
  return Math.ceil(count * 1.2)
}

export type BuilderValue = { topicIds: string[]; count: number; mode: 'timed' | 'practice'; durationSec: number | null }

export function parseBuilder(form: FormData): { ok: true; value: BuilderValue } | { ok: false; error: string } {
  const topicIds = form.getAll('topic').map(String).filter(Boolean)
  if (!topicIds.length) return { ok: false, error: 'Pick at least one topic.' }
  const count = Number(form.get('count'))
  if (!(QUESTION_COUNTS as readonly number[]).includes(count)) return { ok: false, error: 'Choose 10, 20 or 30 questions.' }
  const mode = form.get('mode') === 'timed' ? 'timed' : 'practice'
  if (mode === 'practice') return { ok: true, value: { topicIds, count, mode, durationSec: null } }
  const minutes = Number(form.get('minutes'))
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > 180) {
    return { ok: false, error: 'Set a time limit between 1 and 180 minutes.' }
  }
  return { ok: true, value: { topicIds, count, mode, durationSec: Math.round(minutes * 60) } }
}
