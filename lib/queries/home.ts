import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { isNewItem, nextCaCategory, nextLesson } from '@/lib/home'
import { formatMonth } from '@/lib/periods'
import { getCaOverview } from './current-affairs'
import { getDoneLessonIds } from './content'
import { listMyAttempts, type AttemptRow } from './tests'

function fail(what: string, error: { message: string }): never {
  throw new Error(`Could not load ${what}: ${error.message}`)
}

type OrderedLesson = {
  id: string
  topicId: string
  done: boolean
  title: string
  href: string
  topicName: string
  topicSlug: string
}

/** Every visible lesson in reading order: subject → topic → lesson position. */
async function orderedLessons(): Promise<OrderedLesson[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('subjects')
    .select('slug, position, topics(id, slug, name, position, lessons(id, slug, title, position))')
    .order('position')
  if (error) fail('lessons', error)
  const done = await getDoneLessonIds()
  return data.flatMap((s) =>
    [...s.topics]
      .sort((a, b) => a.position - b.position)
      .flatMap((t) =>
        [...t.lessons]
          .sort((a, b) => a.position - b.position)
          .map((l) => ({
            id: l.id,
            topicId: t.id,
            done: done.has(l.id),
            title: l.title,
            href: `/courses/${s.slug}/${t.slug}/${l.slug}`,
            topicName: t.name,
            topicSlug: t.slug,
          })),
      ),
  )
}

export type Continue =
  | { type: 'attempt'; attemptId: string; testTitle: string; mode: 'timed' | 'practice'; deadlineAt: string | null }
  | { type: 'lesson'; href: string; title: string; topicName: string; first: boolean }
  | { type: 'ca'; href: string; categoryName: string; monthLabel: string }
  | null

export async function getContinue(): Promise<Continue> {
  const supabase = await createClient()
  await supabase.rpc('submit_expired_attempts')
  const { data: open, error } = await supabase
    .from('attempts')
    .select('id, mode, deadline_at, tests(title)')
    .is('submitted_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
  if (error) fail('open attempts', error)
  if (open[0]) {
    const a = open[0]
    return { type: 'attempt', attemptId: a.id, testTitle: a.tests?.title ?? 'Test', mode: a.mode, deadlineAt: a.deadline_at }
  }

  // Fresh current affairs first, once the person has started reading them.
  const ca = await getCaOverview()
  const nextCa = ca ? nextCaCategory(ca.months, ca.readKeys) : null
  if (ca && nextCa) {
    return {
      type: 'ca',
      href: `/courses/${ca.subjectSlug}/current-affairs/${nextCa.month}/${nextCa.category.slug}`,
      categoryName: nextCa.category.name,
      monthLabel: formatMonth(nextCa.month),
    }
  }

  const { data: last, error: lErr } = await supabase
    .from('lesson_progress')
    .select('lesson_id')
    .order('completed_at', { ascending: false })
    .limit(1)
  if (lErr) fail('progress', lErr)
  const lessons = await orderedLessons()
  const next = nextLesson(lessons, last[0]?.lesson_id ?? null)
  if (!next) return null
  return { type: 'lesson', href: next.href, title: next.title, topicName: next.topicName, first: !lessons.some((l) => l.done) }
}

export type TopicProgress = {
  topicId: string
  name: string
  href: string
  done: number
  total: number
  accuracy: number | null
  answered: number
}

export async function getTopicProgress(): Promise<TopicProgress[]> {
  const supabase = await createClient()
  const [{ data: subjects, error }, done, { data: answers, error: aErr }] = await Promise.all([
    supabase.from('subjects').select('slug, position, topics(id, slug, name, position, lessons(id))').order('position'),
    getDoneLessonIds(),
    supabase.from('attempt_answers').select('is_correct, questions(topic_id)').not('is_correct', 'is', null),
  ])
  if (error) fail('topics', error)
  if (aErr) fail('answers', aErr)

  const tally = new Map<string, { right: number; total: number }>()
  for (const a of answers) {
    const topicId = a.questions?.topic_id
    if (!topicId) continue
    const t = tally.get(topicId) ?? { right: 0, total: 0 }
    t.total += 1
    if (a.is_correct) t.right += 1
    tally.set(topicId, t)
  }

  return subjects.flatMap((s) =>
    [...s.topics]
      .sort((a, b) => a.position - b.position)
      .map((t) => {
        const tl = tally.get(t.id)
        return {
          topicId: t.id,
          name: t.name,
          href: `/courses/${s.slug}/${t.slug}`,
          done: t.lessons.filter((l) => done.has(l.id)).length,
          total: t.lessons.length,
          accuracy: tl && tl.total > 0 ? tl.right / tl.total : null,
          answered: tl?.total ?? 0,
        }
      }),
  )
}

export async function getRecentAttempts(limit = 5): Promise<AttemptRow[]> {
  return (await listMyAttempts(1, limit)).rows
}

export type FeedItem = {
  type: 'lesson' | 'test' | 'month'
  title: string
  href: string
  where: string
  publishedAt: string
  isNew: boolean
}

export async function getFeed(limit = 20): Promise<FeedItem[]> {
  const supabase = await createClient()
  const [lessonsRes, testsRes, attemptsRes, done] = await Promise.all([
    supabase
      .from('lessons')
      .select('id, slug, title, published_at, topics(slug, name, subjects(slug, name))')
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })
      .limit(limit),
    supabase
      .from('tests')
      .select('id, title, kind, published_at, subjects(name)')
      .in('kind', ['mock', 'pyq'])
      .is('created_by', null)
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })
      .limit(limit),
    supabase.from('attempts').select('test_id'),
    getDoneLessonIds(),
  ])
  if (lessonsRes.error) fail('new lessons', lessonsRes.error)
  if (testsRes.error) fail('new tests', testsRes.error)
  if (attemptsRes.error) fail('attempts', attemptsRes.error)

  const attempted = new Set(attemptsRes.data.map((a) => a.test_id))
  const now = Date.now()
  const items: FeedItem[] = [
    ...lessonsRes.data.map((l) => ({
      type: 'lesson' as const,
      title: l.title,
      href: `/courses/${l.topics?.subjects?.slug}/${l.topics?.slug}/${l.slug}`,
      where: `${l.topics?.subjects?.name} · ${l.topics?.name}`,
      publishedAt: l.published_at!,
      isNew: isNewItem(l.published_at, done.has(l.id), now),
    })),
    ...testsRes.data.map((t) => ({
      type: 'test' as const,
      title: t.title,
      href: t.kind === 'pyq' ? '/past' : '/tests',
      where: `${t.subjects?.name ?? 'Tests'} · ${t.kind === 'pyq' ? 'Previous-year paper' : 'Mock test'}`,
      publishedAt: t.published_at!,
      isNew: isNewItem(t.published_at, attempted.has(t.id), now),
    })),
  ]
  const ca = await getCaOverview()
  for (const m of ca?.months ?? []) {
    if (!m.publishedAt) continue
    items.push({
      type: 'month',
      title: `${formatMonth(m.month)} current affairs`,
      href: `/courses/${ca!.subjectSlug}/current-affairs/${m.month}`,
      where: `${ca!.subjectName} · ${ca!.sectionName}`,
      publishedAt: m.publishedAt,
      isNew: isNewItem(m.publishedAt, m.read > 0, now),
    })
  }
  return items.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)).slice(0, limit)
}

export type BuilderTopic = { id: string; name: string; subjectName: string; questionCount: number }

export async function getBuilderTopics(): Promise<BuilderTopic[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('subjects')
    .select('name, position, topics(id, name, position, questions(id))') // count(*) is not granted on questions; count the ids
    .order('position')
  if (error) fail('topics', error)
  return data.flatMap((s) =>
    [...s.topics]
      .sort((a, b) => a.position - b.position)
      .map((t) => ({ id: t.id, name: t.name, subjectName: s.name, questionCount: t.questions.length }))
      .filter((t) => t.questionCount > 0),
  )
}


export type CaProgressRow = { month: string; label: string; href: string; read: number; total: number }

/** Up to three latest months of current affairs: categories read out of categories with notes. */
export async function getCaProgress(limit = 3): Promise<CaProgressRow[]> {
  const ca = await getCaOverview()
  if (!ca) return []
  return ca.months.slice(0, limit).map((m) => ({
    month: m.month,
    label: formatMonth(m.month),
    href: `/courses/${ca.subjectSlug}/current-affairs/${m.month}`,
    read: m.read,
    total: m.categories.length,
  }))
}
