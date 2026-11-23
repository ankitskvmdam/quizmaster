import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { isNewItem, nextCaCategory, nextLesson } from '@/lib/home'
import { formatMonth } from '@/lib/periods'
import { getCaOverview } from './current-affairs'
import { getDoneLessonIds } from './content'
import { getCourse, listCourses, type Course } from './courses'
import { flattenLessons, type TreeNode } from '@/lib/courses/tree'
import { listMyAttempts, type AttemptRow } from './tests'
import { pick } from '@/lib/lang'
import { getContentLang } from './user'

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
}

/** Every course with its tree, in course order. */
async function allCourses(): Promise<Course[]> {
  const list = await listCourses()
  return (await Promise.all(list.map((c) => getCourse(c.slug)))).filter((c): c is Course => Boolean(c))
}

/** Every visible lesson in reading order: course → tree (depth first, by position) → lesson position. */
async function orderedLessons(courses: Course[]): Promise<OrderedLesson[]> {
  return courses.flatMap((c) =>
    flattenLessons(c.tree).map((l) => ({
      id: l.id,
      topicId: l.topicId,
      done: l.done,
      title: l.title,
      href: `/courses/${c.slug}/${l.node.path}/${l.slug}`,
      topicName: l.node.name,
    })),
  )
}

export type Continue =
  | { type: 'attempt'; attemptId: string; testTitle: string; mode: 'timed' | 'practice'; deadlineAt: string | null }
  | { type: 'lesson'; href: string; title: string; topicName: string; first: boolean }
  | { type: 'ca'; href: string; categoryName: string; monthLabel: string }
  | { type: 'chapter'; href: string; title: string; number: number; bookTitle: string }
  | null

export async function getContinue(): Promise<Continue> {
  const supabase = await createClient()
  await supabase.rpc('submit_expired_attempts')
  const { data: open, error } = await supabase
    .from('attempts')
    .select('id, mode, deadline_at, tests(title, title_hi)')
    .is('submitted_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
  if (error) fail('open attempts', error)
  if (open[0]) {
    const a = open[0]
    return { type: 'attempt', attemptId: a.id, testTitle: a.tests ? pick(await getContentLang(), a.tests.title, a.tests.title_hi) : 'Test', mode: a.mode, deadlineAt: a.deadline_at }
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
  const courses = await allCourses()
  const lessons = await orderedLessons(courses)
  const next = nextLesson(lessons, last[0]?.lesson_id ?? null)
  if (next) return { type: 'lesson', href: next.href, title: next.title, topicName: next.topicName, first: !lessons.some((l) => l.done) }

  // Every lesson read: the first unread book chapter, in subject and book order.
  for (const c of courses) {
    for (const subject of c.tree.roots) {
      for (const book of subject.books) {
        const ch = book.chapters.find((x) => !x.read)
        if (ch) {
          return {
            type: 'chapter',
            href: `/courses/${c.slug}/${subject.path}/books/${book.slug}/${ch.slug}`,
            title: ch.title,
            number: ch.number,
            bookTitle: book.title,
          }
        }
      }
    }
  }
  return null
}

export type TopicProgress = {
  topicId: string
  name: string
  href: string
  done: number
  total: number
  chaptersRead: number
  chapterTotal: number
  accuracy: number | null
  answered: number
}

export async function getTopicProgress(): Promise<TopicProgress[]> {
  const supabase = await createClient()
  const [courses, { data: answers, error: aErr }] = await Promise.all([
    allCourses(),
    supabase.from('attempt_answers').select('is_correct, questions(topic_id, chapter_id)').not('is_correct', 'is', null),
  ])
  if (aErr) fail('answers', aErr)

  // Which subject each topic and chapter belongs to.
  const subjectOf = new Map<string, string>()
  const mark = (root: TreeNode, n: TreeNode) => {
    subjectOf.set(n.id, root.id)
    n.children.forEach((c) => mark(root, c))
  }
  for (const c of courses) {
    for (const root of c.tree.roots) {
      mark(root, root)
      for (const b of root.books) for (const ch of b.chapters) subjectOf.set(ch.id, root.id)
    }
  }
  const tally = new Map<string, { right: number; total: number }>()
  for (const a of answers) {
    const key = a.questions?.topic_id ?? a.questions?.chapter_id
    const root = key ? subjectOf.get(key) : undefined
    if (!root) continue
    const t = tally.get(root) ?? { right: 0, total: 0 }
    t.total += 1
    if (a.is_correct) t.right += 1
    tally.set(root, t)
  }

  return courses.flatMap((c) =>
    c.tree.roots.map((root) => {
      const t = tally.get(root.id)
      const chapters = root.books.flatMap((b) => b.chapters)
      return {
        topicId: root.id,
        name: root.name,
        href: `/courses/${c.slug}/${root.path}`,
        done: root.doneCount,
        total: root.lessonCount,
        chaptersRead: chapters.filter((ch) => ch.read).length,
        chapterTotal: chapters.length,
        accuracy: t && t.total > 0 ? t.right / t.total : null,
        answered: t?.total ?? 0,
      }
    }),
  )
}

export async function getRecentAttempts(limit = 5): Promise<AttemptRow[]> {
  return (await listMyAttempts(1, limit)).rows
}

export type FeedItem = {
  type: 'lesson' | 'test' | 'month' | 'book'
  title: string
  href: string
  where: string
  publishedAt: string
  isNew: boolean
}

export async function getFeed(limit = 20): Promise<FeedItem[]> {
  const [supabase, lang] = await Promise.all([createClient(), getContentLang()])
  const [lessonsRes, testsRes, attemptsRes, done] = await Promise.all([
    supabase
      .from('lessons')
      .select('id, slug, title, title_hi, published_at, topics(path, name, name_hi, subjects(slug, name, name_hi))')
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
      title: pick(lang, l.title, l.title_hi),
      href: `/courses/${l.topics?.subjects?.slug}/${l.topics?.path}/${l.slug}`,
      where: `${pick(lang, l.topics?.subjects?.name ?? '', l.topics?.subjects?.name_hi)} · ${pick(lang, l.topics?.name ?? '', l.topics?.name_hi)}`,
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
  const { data: books, error: bErr } = await supabase
    .from('books')
    .select('id, slug, title, title_hi, published_at, topics(path, name, name_hi, subjects(slug, name, name_hi)), book_chapters(id, chapter_progress(chapter_id))')
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(limit)
  if (bErr) fail('new books', bErr)
  for (const b of books) {
    items.push({
      type: 'book',
      title: pick(lang, b.title, b.title_hi),
      href: `/courses/${b.topics?.subjects?.slug}/${b.topics?.path}/books/${b.slug}`,
      where: `${pick(lang, b.topics?.subjects?.name ?? '', b.topics?.subjects?.name_hi)} · ${pick(lang, b.topics?.name ?? '', b.topics?.name_hi)} · Book`,
      publishedAt: b.published_at!,
      isNew: isNewItem(b.published_at, b.book_chapters.some((c) => c.chapter_progress.length > 0), now),
    })
  }

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
  const courses = await allCourses()
  return courses.flatMap((c) =>
    c.tree.roots.flatMap((root) => [
      { id: root.id, name: root.name, subjectName: c.name, questionCount: root.questionCount },
      ...root.children.map((n) => ({ id: n.id, name: `${root.name} › ${n.name}`, subjectName: c.name, questionCount: n.questionCount })),
    ]).filter((t) => t.questionCount > 0),
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
