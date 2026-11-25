/** 1.2 minutes per question, rounded up. */
export function defaultMinutes(count: number) {
  return Math.ceil(count * 1.2)
}

// ---------------------------------------------------------------------------
// The step-by-step builder (/new/build): sections of chapters, any count from 5 to 150
// ---------------------------------------------------------------------------
export const MAX_SECTIONS = 10
export const BUILT_MIN = 5
export const BUILT_MAX = 150

export type BuiltTestValue = { sections: string[][]; count: number; mode: 'timed' | 'practice'; durationSec: number | null; title: string | null }

export function parseBuiltTest(form: FormData): { ok: true; value: BuiltTestValue } | { ok: false; error: string } {
  let sections: string[][]
  try {
    const raw: unknown = JSON.parse(String(form.get('sections') ?? '[]'))
    if (!Array.isArray(raw)) throw new Error()
    sections = raw.map((s) => (Array.isArray(s) ? [...new Set(s.map(String).filter(Boolean))] : []))
  } catch {
    return { ok: false, error: 'Something went wrong. Try again.' }
  }
  if (!sections.length) return { ok: false, error: 'Add at least one section.' }
  if (sections.length > MAX_SECTIONS) return { ok: false, error: `A test can have at most ${MAX_SECTIONS} sections.` }
  const empty = sections.findIndex((s) => !s.length)
  if (empty >= 0) return { ok: false, error: `Pick at least one topic in section ${empty + 1}, or remove it.` }
  const count = Number(form.get('count'))
  if (!Number.isInteger(count) || count < BUILT_MIN || count > BUILT_MAX) {
    return { ok: false, error: `Choose between ${BUILT_MIN} and ${BUILT_MAX} questions.` }
  }
  const title = String(form.get('title') ?? '').trim().slice(0, 200) || null
  const mode = form.get('mode') === 'timed' ? 'timed' : 'practice'
  if (mode === 'practice') return { ok: true, value: { sections, count, mode, durationSec: null, title } }
  const minutes = Number(form.get('minutes'))
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > 300) {
    return { ok: false, error: 'Set a time limit between 1 and 300 minutes.' }
  }
  return { ok: true, value: { sections, count, mode, durationSec: Math.round(minutes * 60), title } }
}

/**
 * How many questions each section gets: an even split, capped by what each section has, with any spare share passed
 * on to the sections that have more. Mirrors create_built_test, for the preview.
 */
export function splitCount(total: number, available: number[]): number[] {
  const take = available.map(() => 0)
  let remaining = total
  for (;;) {
    const open = available.map((a, i) => i).filter((i) => take[i] < available[i])
    if (remaining <= 0 || open.length === 0) return take
    const share = Math.max(Math.floor(remaining / open.length), 1)
    for (const i of open) {
      const give = Math.min(share, available[i] - take[i], remaining)
      take[i] += give
      remaining -= give
      if (remaining === 0) break
    }
  }
}
