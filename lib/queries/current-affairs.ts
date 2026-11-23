import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { dateToMonth, monthToDate, type MonthKey, type Period } from '@/lib/periods'

function fail(what: string, error: { message: string } | null): never {
  throw new Error(`Could not load ${what}${error ? `: ${error.message}` : ''}`)
}

export const CA_SECTION_SLUG = 'current-affairs'

export type CaCategory = { slug: string; name: string; position: number }
export type CaNote = { slug: string; happenedOn: string | null; body_md: string; angle_md: string | null }

/** All categories in display order. */
export const getCategories = cache(async (): Promise<CaCategory[]> => {
  const supabase = await createClient()
  const { data, error } = await supabase.from('ca_categories').select('slug, name, position').order('position')
  if (error) fail('categories', error)
  return data
})

/** The current-affairs section of a subject (or null if it has none). */
export const getCaSection = cache(async (subjectSlug: string) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('sections')
    .select('id, slug, name, subjects!inner(slug, name)')
    .eq('kind', 'current_affairs')
    .eq('subjects.slug', subjectSlug)
    .maybeSingle()
  if (error) fail('section', error)
  return data ? { id: data.id, name: data.name, subject: data.subjects } : null
})

/** Read ticks of the signed-in user, as "monthId/category". RLS limits ca_progress to the caller. */
const getReadTicks = cache(async (): Promise<Set<string>> => {
  const supabase = await createClient()
  const { data, error } = await supabase.from('ca_progress').select('month_id, category_slug')
  if (error) fail('read ticks', error)
  return new Set(data.map((r) => `${r.month_id}/${r.category_slug}`))
})

type MonthRaw = {
  id: string
  month: string
  ca_notes: { category_slug: string }[]
  questions: { id: string; ca_category_slug: string | null; retired: boolean }[]
  tests: { id: string; kind: string; published: boolean }[]
}

/** Published months of a section in a date range (inclusive), newest first, with what they contain. */
async function monthsRaw(sectionId: string, from?: MonthKey, to?: MonthKey): Promise<MonthRaw[]> {
  const supabase = await createClient()
  let q = supabase
    .from('ca_months')
    .select('id, month, ca_notes(category_slug), questions(id, ca_category_slug, retired), tests(id, kind, published)')
    .eq('section_id', sectionId)
    .order('month', { ascending: false })
  if (from) q = q.gte('month', monthToDate(from))
  if (to) q = q.lte('month', monthToDate(to))
  const { data, error } = await q
  if (error) fail('months', error)
  return data as MonthRaw[]
}

export type MonthSummary = {
  id: string
  month: MonthKey
  noteCount: number
  questionCount: number
  categoriesWithNotes: number
  categoriesRead: number
  hasPaper: boolean
}

export async function listMonths(subjectSlug: string): Promise<MonthSummary[]> {
  const section = await getCaSection(subjectSlug)
  if (!section) return []
  const [rows, ticks] = await Promise.all([monthsRaw(section.id), getReadTicks()])
  return rows.map((m) => {
    const withNotes = new Set(m.ca_notes.map((n) => n.category_slug))
    return {
      id: m.id,
      month: dateToMonth(m.month),
      noteCount: m.ca_notes.length,
      questionCount: m.questions.filter((q) => !q.retired).length,
      categoriesWithNotes: withNotes.size,
      categoriesRead: [...withNotes].filter((c) => ticks.has(`${m.id}/${c}`)).length,
      hasPaper: m.tests.some((t) => t.kind === 'mock' && t.published),
    }
  })
}

export type MonthCategory = { slug: string; name: string; noteCount: number; questionCount: number; read: boolean }
export type MonthPaper = {
  testId: string
  title: string
  questionCount: number
  durationSec: number | null
  marksCorrect: number
  marksWrong: number
  bestScore: number | null
}

export async function getMonth(subjectSlug: string, month: MonthKey) {
  const section = await getCaSection(subjectSlug)
  if (!section) return null
  const [rows, categories, ticks] = await Promise.all([monthsRaw(section.id, month, month), getCategories(), getReadTicks()])
  const m = rows[0]
  if (!m) return null

  const cats: MonthCategory[] = categories
    .map((c) => ({
      slug: c.slug,
      name: c.name,
      noteCount: m.ca_notes.filter((n) => n.category_slug === c.slug).length,
      questionCount: m.questions.filter((q) => !q.retired && q.ca_category_slug === c.slug).length,
      read: ticks.has(`${m.id}/${c.slug}`),
    }))
    .filter((c) => c.noteCount > 0 || c.questionCount > 0)

  let paper: MonthPaper | null = null
  const paperRow = m.tests.find((t) => t.kind === 'mock' && t.published)
  if (paperRow) {
    const supabase = await createClient()
    const [{ data: t, error }, { data: best }] = await Promise.all([
      supabase
        .from('tests')
        .select('id, title, duration_sec, marks_correct, marks_wrong, test_questions(count)')
        .eq('id', paperRow.id)
        .single(),
      supabase.from('attempts').select('score').eq('test_id', paperRow.id).not('submitted_at', 'is', null),
    ])
    if (error) fail('month paper', error)
    const scores = (best ?? []).map((a) => Number(a.score)).filter((s) => !Number.isNaN(s))
    paper = {
      testId: t.id,
      title: t.title,
      questionCount: t.test_questions[0]?.count ?? 0,
      durationSec: t.duration_sec,
      marksCorrect: Number(t.marks_correct),
      marksWrong: Number(t.marks_wrong),
      bestScore: scores.length ? Math.max(...scores) : null,
    }
  }

  return {
    section,
    monthId: m.id,
    month,
    categories: cats,
    noteCount: m.ca_notes.length,
    questionCount: m.questions.filter((q) => !q.retired).length,
    paper,
  }
}

const byDateThenPosition = (a: { happened_on: string | null; position: number }, b: { happened_on: string | null; position: number }) =>
  (a.happened_on ?? '9999').localeCompare(b.happened_on ?? '9999') || a.position - b.position

const toNote = (n: { slug: string; happened_on: string | null; body_md: string; angle_md: string | null }): CaNote => ({
  slug: n.slug,
  happenedOn: n.happened_on,
  body_md: n.body_md,
  angle_md: n.angle_md,
})

export async function getCategoryNotes(subjectSlug: string, month: MonthKey, categorySlug: string) {
  const m = await getMonth(subjectSlug, month)
  if (!m) return null
  const i = m.categories.findIndex((c) => c.slug === categorySlug)
  if (i === -1) return null
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ca_notes')
    .select('slug, happened_on, body_md, angle_md, position')
    .eq('month_id', m.monthId)
    .eq('category_slug', categorySlug)
  if (error) fail('notes', error)
  const cat = m.categories[i]
  return {
    monthId: m.monthId,
    category: { slug: cat.slug, name: cat.name },
    notes: [...data].sort(byDateThenPosition).map(toNote),
    read: cat.read,
    questionCount: cat.questionCount,
    prev: m.categories[i - 1] ? { slug: m.categories[i - 1].slug, name: m.categories[i - 1].name } : null,
    next: m.categories[i + 1] ? { slug: m.categories[i + 1].slug, name: m.categories[i + 1].name } : null,
  }
}

export type PeriodCategory = { slug: string; name: string; noteCount: number; questionCount: number }

export async function getPeriod(subjectSlug: string, period: Period) {
  const section = await getCaSection(subjectSlug)
  if (!section) return null
  const [rows, categories] = await Promise.all([monthsRaw(section.id, period.from, period.to), getCategories()])
  const notes = rows.flatMap((m) => m.ca_notes)
  const questions = rows.flatMap((m) => m.questions).filter((q) => !q.retired)
  return {
    section,
    period,
    months: rows.map((m) => dateToMonth(m.month)),
    noteCount: notes.length,
    questionCount: questions.length,
    categories: categories
      .map(
        (c): PeriodCategory => ({
          slug: c.slug,
          name: c.name,
          noteCount: notes.filter((n) => n.category_slug === c.slug).length,
          questionCount: questions.filter((q) => q.ca_category_slug === c.slug).length,
        }),
      )
      .filter((c) => c.noteCount > 0 || c.questionCount > 0),
  }
}

export async function getPeriodNotes(subjectSlug: string, period: Period, categorySlug: string) {
  const section = await getCaSection(subjectSlug)
  if (!section) return null
  const category = (await getCategories()).find((c) => c.slug === categorySlug)
  if (!category) return null
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ca_notes')
    .select('slug, happened_on, body_md, angle_md, position, ca_months!inner(month, section_id)')
    .eq('category_slug', categorySlug)
    .eq('ca_months.section_id', section.id)
    .gte('ca_months.month', monthToDate(period.from))
    .lte('ca_months.month', monthToDate(period.to))
  if (error) fail('period notes', error)
  // Live questions of this category in the period's published months (RLS on ca_months hides unpublished ones).
  const { data: qs, error: qErr } = await supabase
    .from('questions')
    .select('id, ca_months!inner(month, section_id)')
    .eq('ca_category_slug', categorySlug)
    .eq('retired', false)
    .eq('ca_months.section_id', section.id)
    .gte('ca_months.month', monthToDate(period.from))
    .lte('ca_months.month', monthToDate(period.to))
  if (qErr) fail('period questions', qErr)
  const groups = new Map<MonthKey, typeof data>()
  for (const n of data) {
    const k = dateToMonth(n.ca_months.month)
    groups.set(k, [...(groups.get(k) ?? []), n])
  }
  return {
    category: { slug: category.slug, name: category.name },
    questionCount: qs.length,
    groups: [...groups.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([month, notes]) => ({ month, notes: [...notes].sort(byDateThenPosition).map(toNote) })),
  }
}

export type CaOverviewMonth = {
  monthId: string
  month: MonthKey
  publishedAt: string | null
  categories: { slug: string; name: string }[] // categories with notes, in display order
  read: number
}

/**
 * Current affairs at a glance for Study and the New feed: the first current-affairs section (any subject),
 * its months newest first with the categories that have notes, and the person's read ticks.
 */
export const getCaOverview = cache(async () => {
  const supabase = await createClient()
  const { data: sec, error } = await supabase
    .from('sections')
    .select('id, name, subjects!inner(slug, name)')
    .eq('kind', 'current_affairs')
    .order('position')
    .limit(1)
    .maybeSingle()
  if (error) fail('section', error)
  if (!sec) return null
  const [{ data: months, error: mErr }, categories, ticks] = await Promise.all([
    supabase
      .from('ca_months')
      .select('id, month, published_at, ca_notes(category_slug)')
      .eq('section_id', sec.id)
      .order('month', { ascending: false })
      .limit(12),
    getCategories(),
    getReadTicks(),
  ])
  if (mErr) fail('months', mErr)
  return {
    subjectSlug: sec.subjects.slug,
    subjectName: sec.subjects.name,
    sectionName: sec.name,
    readKeys: ticks,
    months: months.map((m): CaOverviewMonth => {
      const withNotes = new Set(m.ca_notes.map((n) => n.category_slug))
      const cats = categories.filter((c) => withNotes.has(c.slug)).map((c) => ({ slug: c.slug, name: c.name }))
      return {
        monthId: m.id,
        month: dateToMonth(m.month),
        publishedAt: m.published_at,
        categories: cats,
        read: cats.filter((c) => ticks.has(`${m.id}/${c.slug}`)).length,
      }
    }),
  }
})
