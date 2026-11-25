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
  /** A previous-year paper's date and shift/set, e.g. "14 Jul 2023 · Shift 1". */
  subtitle?: string
}

type Supabase = Awaited<ReturnType<typeof createClient>>

/** The caller's best submitted score per test. */
async function bestScores(supabase: Supabase, ids: string[]): Promise<Map<string, number>> {
  const best = new Map<string, number>()
  if (!ids.length) return best
  const { data: attempts, error } = await supabase.from('attempts').select('test_id, score').in('test_id', ids).not('submitted_at', 'is', null)
  if (error) fail('scores', error)
  for (const a of attempts) {
    if (a.score === null) continue
    best.set(a.test_id, Math.max(best.get(a.test_id) ?? -Infinity, Number(a.score)))
  }
  return best
}

export type ExamCard = { slug: string; name: string; description: string; paperCount: number; firstYear: number | null; lastYear: number | null }

/** Every exam (BPSC, SSC CGL …) in order, with how many published papers it has and the years they span. */
export async function listExams(): Promise<ExamCard[]> {
  const [supabase, lang] = await Promise.all([createClient(), getContentLang()])
  const { data, error } = await supabase
    .from('exams')
    .select('slug, name, name_hi, description, description_hi, position, tests(year, published_at, kind)')
    .order('position')
  if (error) fail('exams', error)
  return data.map((e) => {
    const years = e.tests.filter((t) => t.kind === 'pyq' && t.published_at).map((t) => t.year ?? 0).filter(Boolean)
    return {
      slug: e.slug,
      name: pick(lang, e.name, e.name_hi),
      description: pick(lang, e.description, e.description_hi),
      paperCount: years.length,
      firstYear: years.length ? Math.min(...years) : null,
      lastYear: years.length ? Math.max(...years) : null,
    }
  })
}

const dateLabel = (iso: string) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

/** One exam's slug and name in the reader's language, or null when there is no such exam. */
export async function getExam(slug: string): Promise<{ slug: string; name: string } | null> {
  const [supabase, lang] = await Promise.all([createClient(), getContentLang()])
  const { data: exam, error } = await supabase.from('exams').select('slug, name, name_hi').eq('slug', slug).maybeSingle()
  if (error) fail('exam', error)
  return exam ? { slug: exam.slug, name: pick(lang, exam.name, exam.name_hi) } : null
}

/** One exam and its published papers, newest year first (then by date), with the caller's best score on each. */
export async function getExamPapers(slug: string): Promise<{ exam: ExamCard; papers: (TestRow & { year: number })[] } | null> {
  const [supabase, lang] = await Promise.all([createClient(), getContentLang()])
  const { data: exam, error } = await supabase.from('exams').select('slug, name, name_hi, description, description_hi').eq('slug', slug).maybeSingle()
  if (error) fail('exam', error)
  if (!exam) return null
  const { data, error: tErr } = await supabase
    .from('tests')
    .select('id, slug, title, title_hi, year, paper_date, paper_label, duration_sec, marks_correct, marks_wrong, test_questions(count)')
    .eq('exam_slug', slug)
    .eq('kind', 'pyq')
    .not('published_at', 'is', null)
    .order('year', { ascending: false })
    .order('paper_date', { ascending: false })
    .order('paper_label')
  if (tErr) fail('papers', tErr)
  const best = await bestScores(supabase, data.map((t) => t.id))
  const papers = data.map((t) => {
    const questionCount = t.test_questions[0]?.count ?? 0
    return {
      id: t.id,
      slug: t.slug,
      title: pick(lang, t.title, t.title_hi),
      year: t.year ?? 0,
      questionCount,
      durationSec: t.duration_sec,
      marksCorrect: Number(t.marks_correct),
      marksWrong: Number(t.marks_wrong),
      maxScore: questionCount * Number(t.marks_correct),
      bestScore: best.get(t.id) ?? null,
      isCurrentAffairs: false,
      // SSC labels already start with the day ("26 Mar, Shift 1"): don't repeat it after the full date.
      subtitle: [t.paper_date ? dateLabel(t.paper_date) : null, (t.paper_label ?? '').replace(/^d{1,2} w{3},s*/, '')].filter(Boolean).join(' · '),
    }
  })
  const years = papers.map((p) => p.year)
  return {
    exam: {
      slug: exam.slug,
      name: pick(lang, exam.name, exam.name_hi),
      description: pick(lang, exam.description, exam.description_hi),
      paperCount: papers.length,
      firstYear: years.length ? Math.min(...years) : null,
      lastYear: years.length ? Math.max(...years) : null,
    },
    papers,
  }
}

/** Official tests of one kind (not tied to an exam), with the caller's best submitted score on each. */
export async function listTests(kind: 'mock' | 'pyq'): Promise<TestRow[]> {
  const supabase = await createClient()
  let query = supabase
    .from('tests')
    .select('id, slug, title, year, duration_sec, marks_correct, marks_wrong, published_at, ca_month_id, test_questions(count)')
    .eq('kind', kind)
    .is('created_by', null)
    .is('exam_slug', null)
  query = kind === 'pyq'
    ? query.order('year', { ascending: false }).order('title')
    : query.order('published_at', { ascending: false })
  const { data, error } = await query
  if (error) fail('tests', error)

  const best = await bestScores(supabase, data.map((t) => t.id))

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

/** Tests the caller built (the New tab's builder and "Practice this"), newest first, with their best score. */
export async function listMyBuiltTests(limit = 50): Promise<(TestRow & { createdAt: string })[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from('tests')
    .select('id, slug, title, year, duration_sec, marks_correct, marks_wrong, created_at, test_questions(count)')
    .eq('kind', 'custom')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) fail('your tests', error)
  const best = await bestScores(supabase, data.map((t) => t.id))
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
      isCurrentAffairs: false,
      createdAt: t.created_at,
    }
  })
}
