import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { pick } from '@/lib/lang'
import { getContentLang } from './user'

function fail(what: string, error: { message: string }): never {
  throw new Error(`Could not load ${what}: ${error.message}`)
}

export type TestRow = {
  id: string
  slug: string | null
  title: string
  year: number | null
  questionCount: number
  durationSec: number | null
  marksCorrect: number
  marksWrong: number
  maxScore: number
  bestScore: number | null
  isCurrentAffairs: boolean
}

/** Official tests of one kind, with the caller's best submitted score on each. */
export async function listTests(kind: 'mock' | 'pyq'): Promise<TestRow[]> {
  const supabase = await createClient()
  let query = supabase
    .from('tests')
    .select('id, slug, title, year, duration_sec, marks_correct, marks_wrong, published_at, ca_month_id, test_questions(count)')
    .eq('kind', kind)
    .is('created_by', null)
  query = kind === 'pyq'
    ? query.order('year', { ascending: false }).order('title')
    : query.order('published_at', { ascending: false })
  const { data, error } = await query
  if (error) fail('tests', error)

  const ids = data.map((t) => t.id)
  const best = new Map<string, number>()
  if (ids.length) {
    const { data: attempts, error: aErr } = await supabase
      .from('attempts')
      .select('test_id, score')
      .in('test_id', ids)
      .not('submitted_at', 'is', null)
    if (aErr) fail('scores', aErr)
    for (const a of attempts) {
      if (a.score === null) continue
      const s = Number(a.score)
      best.set(a.test_id, Math.max(best.get(a.test_id) ?? -Infinity, s))
    }
  }

  return data.map((t) => {
    const questionCount = t.test_questions[0]?.count ?? 0
    return {
      id: t.id,
      slug: t.slug,
      title: t.title,
      year: t.year,
      questionCount,
      durationSec: t.duration_sec,
      marksCorrect: Number(t.marks_correct),
      marksWrong: Number(t.marks_wrong),
      maxScore: questionCount * Number(t.marks_correct),
      bestScore: best.get(t.id) ?? null,
      isCurrentAffairs: t.ca_month_id !== null,
    }
  })
}

export type AttemptRow = {
  id: string
  testTitle: string
  testKind: 'mock' | 'pyq' | 'custom'
  mode: 'timed' | 'practice'
  score: number | null
  maxScore: number
  accuracy: number | null
  durationSec: number | null
  submittedAt: string
}

/** The caller's submitted attempts, newest first. Expired timed attempts are submitted first so none go missing. */
export async function listMyAttempts(page: number, pageSize = 20): Promise<{ rows: AttemptRow[]; hasMore: boolean }> {
  const [supabase, lang] = await Promise.all([createClient(), getContentLang()])
  await supabase.rpc('submit_expired_attempts')
  const from = Math.max(0, page - 1) * pageSize
  const { data, error } = await supabase
    .from('attempts')
    .select('id, mode, score, n_correct, n_wrong, n_skipped, started_at, submitted_at, tests(title, title_hi, kind, marks_correct)')
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: false })
    .range(from, from + pageSize) // one extra row tells us whether there is a next page
  if (error) fail('attempts', error)
  const rows = data.slice(0, pageSize).map((a): AttemptRow => {
    const answered = (a.n_correct ?? 0) + (a.n_wrong ?? 0)
    const total = answered + (a.n_skipped ?? 0)
    return {
      id: a.id,
      testTitle: a.tests ? pick(lang, a.tests.title, a.tests.title_hi) : 'Test',
      testKind: (a.tests?.kind ?? 'custom') as AttemptRow['testKind'],
      mode: a.mode,
      score: a.score === null ? null : Number(a.score),
      maxScore: total * Number(a.tests?.marks_correct ?? 1),
      accuracy: answered > 0 ? (a.n_correct ?? 0) / answered : null,
      durationSec: a.submitted_at ? (Date.parse(a.submitted_at) - Date.parse(a.started_at)) / 1000 : null,
      submittedAt: a.submitted_at!,
    }
  })
  return { rows, hasMore: data.length > pageSize }
}
