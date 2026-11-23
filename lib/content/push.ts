import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/lib/supabase/database.types'
import { dateToMonth, monthToDate } from '@/lib/periods'
import {
  ContentError,
  type CaNoteItem,
  type BookItem,
  type CategoryItem,
  type ChapterItem,
  type ContentBundle,
  type LessonItem,
  type QuestionItem,
  type SectionItem,
  type SubjectItem,
  type TestItem,
  type TopicItem,
} from './load'
import { lockedTestChanges, planChanges, type Plan } from './plan'
import { selectAll } from './select-all'

const chunk = <T,>(xs: T[], n: number): T[][] => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n))

type Db = SupabaseClient<Database>
type Counts = { created: number; updated: number; unchanged: number; unpublished: number; removed: number; retired: number }
export type PushSummary = Record<
  'subjects' | 'sections' | 'topics' | 'books' | 'chapters' | 'lessons' | 'categories' | 'months' | 'notes' | 'questions' | 'tests',
  Counts
>

const counts = <T>(p: Plan<T>, extra: Partial<Counts> = {}): Counts => ({
  created: p.create.length,
  updated: p.update.length,
  unchanged: p.unchanged.length,
  unpublished: 0,
  removed: 0,
  retired: 0,
  ...extra,
})

function must<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`)
  return res.data as T
}

type MonthRow = { subjectSlug: string; sectionSlug: string; month: string; published: boolean }
type NoteRow = CaNoteItem & { monthRef: string }
type QuestionRow = QuestionItem & { retired: boolean }

const monthKey = (m: { subjectSlug: string; sectionSlug: string; month: string }) => `${m.subjectSlug}/${m.sectionSlug}/${m.month}`
const lessonKey = (l: LessonItem) => `${l.subjectSlug}/${l.topicPath}/${l.slug}`
const topicKey = (t: TopicItem) => `${t.subjectSlug}/${t.path}`
const bookKey = (b: BookItem) => `${b.subjectSlug}/${b.topicPath}/${b.slug}`
const chapterKey = (c: ChapterItem) => `${c.bookRef}/${c.slug}`
/** "gs/history/ancient" → ["gs", "history/ancient"] */
const splitRef = (ref: string) => [ref.slice(0, ref.indexOf('/')), ref.slice(ref.indexOf('/') + 1)] as const
const sectionKey = (s: SectionItem) => `${s.subjectSlug}/${s.slug}`
const noteKey = (n: NoteRow) => `${n.monthRef}/${n.slug}`

/** Everything in the database that came from content files, keyed by slugs (never ids). */
async function readExisting(db: Db) {
  // Every read is paged: the API returns at most 1000 rows per request (see selectAll).
  const [subjects, sections, topics, lessons, categories, months, notes, questions, tests, books, chapters, chapterTopics] = await Promise.all([
    selectAll((f, t) => db.from('subjects').select('id, slug, name, description, position, published').order('id').range(f, t), 'read subjects'),
    selectAll((f, t) => db.from('sections').select('id, subject_id, slug, name, kind, position').order('id').range(f, t), 'read sections'),
    selectAll(
      (f, t) => db.from('topics').select('id, subject_id, section_id, parent_id, path, slug, name, description, position').order('id').range(f, t),
      'read topics',
    ),
    selectAll(
      (f, t) => db.from('lessons').select('id, topic_id, slug, title, body_md, position, published, published_at').order('id').range(f, t),
      'read lessons',
    ),
    selectAll((f, t) => db.from('ca_categories').select('slug, name, position').order('slug').range(f, t), 'read categories'),
    selectAll((f, t) => db.from('ca_months').select('id, section_id, month, published, published_at').order('id').range(f, t), 'read months'),
    selectAll(
      (f, t) =>
        db.from('ca_notes').select('id, month_id, category_slug, slug, happened_on, body_md, angle_md, position').order('id').range(f, t),
      'read notes',
    ),
    selectAll(
      (f, t) =>
        db
          .from('questions')
          .select('id, slug, topic_id, ca_month_id, ca_category_slug, chapter_id, retired, stem_md, options, correct_key, explanation_md, difficulty, source, tags')
          .order('id')
          .range(f, t),
      'read questions',
    ),
    selectAll(
      (f, t) =>
        db
          .from('tests')
          .select('id, slug, title, kind, subject_id, year, duration_sec, marks_correct, marks_wrong, published, published_at, ca_month_id, chapter_id')
          .is('created_by', null)
          .not('slug', 'is', null)
          .order('id')
          .range(f, t),
      'read tests',
    ),
    selectAll(
      (f, t) =>
        db.from('books').select('id, topic_id, slug, title, author, edition, description, position, published, published_at').order('id').range(f, t),
      'read books',
    ),
    selectAll((f, t) => db.from('book_chapters').select('id, book_id, slug, number, title, gist_md, position').order('id').range(f, t), 'read chapters'),
    selectAll(
      (f, t) => db.from('chapter_topics').select('chapter_id, topic_id').order('chapter_id').order('topic_id').range(f, t),
      'read chapter tags',
    ),
  ])
  // Only official tests' question lists: custom tests (every practice set learners start) are never compared.
  const testQuestions = (
    await Promise.all(
      chunk(tests.map((t) => t.id), 100).map((ids) =>
        selectAll(
          (f, t) =>
            db.from('test_questions').select('test_id, question_id, position').in('test_id', ids).order('test_id').order('position').range(f, t),
          'read test questions',
        ),
      ),
    )
  ).flat()

  type Rows = Database['public']['Tables']
  const subj = subjects as Rows['subjects']['Row'][]
  const secs = sections as Rows['sections']['Row'][]
  const tops = topics as Rows['topics']['Row'][]
  const mons = months as Rows['ca_months']['Row'][]
  const qs = questions as Rows['questions']['Row'][]

  const subjectSlug = new Map(subj.map((s) => [s.id, s.slug]))
  const section = new Map(secs.map((s) => [s.id, s]))
  const topicRef = new Map(tops.map((t) => [t.id, `${subjectSlug.get(t.subject_id)}/${t.path}`]))
  const topicPath = new Map(tops.map((t) => [t.id, t.path]))
  const bookRef = new Map(books.map((b) => [b.id, `${topicRef.get(b.topic_id)}/${b.slug}`]))
  const chapterRef = new Map(chapters.map((c) => [c.id, `${bookRef.get(c.book_id)}/${c.slug}`]))
  const monthRef = new Map(
    mons.map((m) => {
      const s = section.get(m.section_id)!
      return [m.id, `${subjectSlug.get(s.subject_id)}/${s.slug}/${dateToMonth(m.month)}`]
    }),
  )
  const questionSlug = new Map(qs.map((q) => [q.id, q.slug]))

  return {
    subjects: subj.map((s): SubjectItem & { id: string } => ({ ...s })),
    sections: secs.map((s): SectionItem & { id: string } => ({
      id: s.id,
      subjectSlug: subjectSlug.get(s.subject_id)!,
      slug: s.slug,
      name: s.name,
      kind: s.kind,
      position: s.position,
    })),
    topics: tops.map((t): TopicItem & { id: string } => ({
      id: t.id,
      subjectSlug: subjectSlug.get(t.subject_id)!,
      slug: t.slug,
      name: t.name,
      description: t.description,
      position: t.position,
      path: t.path,
      parentPath: t.parent_id ? (topicPath.get(t.parent_id) ?? null) : null,
      ...(t.section_id ? { sectionSlug: section.get(t.section_id)?.slug } : {}),
    })),
    books: books.map((b): BookItem & { id: string; published_at: string | null } => {
      const [subjectSlug_, path_] = splitRef(topicRef.get(b.topic_id)!)
      return {
        id: b.id,
        subjectSlug: subjectSlug_,
        topicPath: path_,
        slug: b.slug,
        title: b.title,
        author: b.author,
        edition: b.edition,
        description: b.description,
        position: b.position,
        published: b.published,
        published_at: b.published_at,
      }
    }),
    chapters: chapters.map((c): ChapterItem & { id: string } => ({
      id: c.id,
      bookRef: bookRef.get(c.book_id)!,
      slug: c.slug,
      number: c.number,
      title: c.title,
      gist_md: c.gist_md,
      position: c.position,
      covers: chapterTopics.filter((ct) => ct.chapter_id === c.id).map((ct) => topicPath.get(ct.topic_id)!),
    })),
    lessons: (lessons as Rows['lessons']['Row'][]).map((l): LessonItem & { id: string; published_at: string | null } => {
      const [s, t] = splitRef(topicRef.get(l.topic_id)!)
      return {
        id: l.id,
        subjectSlug: s,
        topicPath: t,
        slug: l.slug,
        title: l.title,
        position: l.position,
        published: l.published,
        body_md: l.body_md,
        published_at: l.published_at,
      }
    }),
    categories: categories as CategoryItem[],
    months: mons.map((m): MonthRow & { id: string; published_at: string | null } => {
      const [subjectSlug_, sectionSlug, month] = monthRef.get(m.id)!.split('/')
      return { id: m.id, subjectSlug: subjectSlug_, sectionSlug, month, published: m.published, published_at: m.published_at }
    }),
    notes: (notes as Rows['ca_notes']['Row'][]).map((n): NoteRow & { id: string } => ({
      id: n.id,
      monthRef: monthRef.get(n.month_id)!,
      slug: n.slug,
      categorySlug: n.category_slug,
      happenedOn: n.happened_on,
      body_md: n.body_md,
      angle_md: n.angle_md,
      position: n.position,
    })),
    questions: qs.map((q): QuestionRow & { id: string } => ({
      id: q.id,
      slug: q.slug,
      topicRef: q.topic_id ? topicRef.get(q.topic_id)! : null,
      caMonthRef: q.ca_month_id ? monthRef.get(q.ca_month_id)! : null,
      categorySlug: q.ca_category_slug,
      chapterRef: q.chapter_id ? (chapterRef.get(q.chapter_id) ?? null) : null,
      stem_md: q.stem_md,
      options: q.options as QuestionItem['options'],
      correctKey: q.correct_key,
      explanation_md: q.explanation_md,
      difficulty: q.difficulty,
      source: q.source,
      tags: q.tags,
      retired: q.retired,
    })),
    tests: (tests as Rows['tests']['Row'][]).map((t): TestItem & { id: string; published_at: string | null } => ({
      id: t.id,
      slug: t.slug!,
      title: t.title,
      kind: t.kind as TestItem['kind'],
      subjectSlug: t.subject_id ? subjectSlug.get(t.subject_id)! : '',
      year: t.year,
      durationSec: t.duration_sec,
      marksCorrect: Number(t.marks_correct),
      marksWrong: Number(t.marks_wrong),
      published: t.published,
      published_at: t.published_at,
      questionSlugs: (testQuestions as Rows['test_questions']['Row'][])
        .filter((tq) => tq.test_id === t.id)
        .sort((a, b) => a.position - b.position)
        .map((tq) => questionSlug.get(tq.question_id)!),
      caMonthRef: t.ca_month_id ? (monthRef.get(t.ca_month_id) ?? null) : null,
      chapterRef: t.chapter_id ? (chapterRef.get(t.chapter_id) ?? null) : null,
    })),
  }
}

/**
 * Upserts the bundle by slug. With prune: unpublishes subjects, lessons, books, tests and months the files dropped,
 * deletes notes dropped from a pushed month, and retires questions the files dropped (never deletes them).
 */
export async function pushContent(
  bundle: ContentBundle,
  db: Db,
  opts: { dry: boolean; prune: boolean; force?: boolean },
): Promise<PushSummary> {
  const existing = await readExisting(db)
  // Compare on content fields only: ids and publish dates live in the database, not the files.
  const strip = <T extends object>(x: T) => {
    const rest = { ...x } as T & { id?: string; published_at?: string | null }
    delete rest.id
    delete rest.published_at
    return rest as Omit<T, 'id' | 'published_at'>
  }

  const desiredMonths: MonthRow[] = bundle.months.map(({ notes: _notes, ...m }) => ({ ...m, published: true }))
  const desiredNotes: NoteRow[] = bundle.months.flatMap((m) => m.notes.map((n) => ({ ...n, monthRef: monthKey(m) })))
  const desiredQuestions: QuestionRow[] = bundle.questions.map((q) => ({ ...q, retired: false }))

  const subjectPlan = planChanges(existing.subjects.map(strip), bundle.subjects, (s) => s.slug, (s) => s)
  const sectionPlan = planChanges(existing.sections.map(strip), bundle.sections, sectionKey, (s) => s)
  const topicPlan = planChanges(existing.topics.map(strip), bundle.topics, topicKey, (t) => t)
  const lessonPlan = planChanges(existing.lessons.map(strip), bundle.lessons, lessonKey, (l) => l)
  const bookPlan = planChanges(existing.books.map(strip), bundle.books, bookKey, (b) => b)
  // Tag order doesn't matter.
  const chapterPlan = planChanges(existing.chapters.map(strip), bundle.chapters, chapterKey, (c) => ({ ...c, covers: [...c.covers].sort() }))
  const categoryPlan = planChanges(existing.categories, bundle.categories, (c) => c.slug, (c) => c)
  const monthPlan = planChanges(existing.months.map(strip), desiredMonths, monthKey, (m) => m)
  const notePlan = planChanges(existing.notes.map(strip), desiredNotes, noteKey, (n) => n)
  const questionPlan = planChanges(existing.questions.map(strip), desiredQuestions, (q) => q.slug, (q) => q)
  const testPlan = planChanges(existing.tests.map(strip), bundle.tests, (t) => t.slug, (t) => t)

  // Attempts read a test's current question list, so changing it would rewrite past reviews and running tests.
  // Which official tests have attempts (paged, and only for official tests, so a big attempts table can't hide one).
  const attempted = new Set(
    (
      await Promise.all(
        chunk(existing.tests.map((t) => t.id), 100).map((ids) =>
          selectAll((f, t) => db.from('attempts').select('test_id').in('test_id', ids).order('id').range(f, t), 'read attempts'),
        ),
      )
    )
      .flat()
      .map((a) => a.test_id),
  )
  const attemptedSlugs = new Set(existing.tests.filter((t) => attempted.has(t.id)).map((t) => t.slug))
  const locked = lockedTestChanges(existing.tests, testPlan.update, attemptedSlugs)
  if (locked.length && !opts.force) {
    throw new ContentError(
      locked.map((slug) => ({
        file: (() => {
          const ref = bundle.tests.find((t) => t.slug === slug)?.caMonthRef
          return ref ? `${ref}/test.yaml` : `tests/${slug}.yaml`
        })(),
        message:
          `${slug} has attempts, so its questions can't change without rewriting past reviews. ` +
          'Publish the new list as a new test (new slug), or pass --force to change it anyway.',
      })),
    )
  }

  const pushedMonths = new Set(desiredMonths.map(monthKey))
  const prune = opts.prune
    ? {
        subjects: subjectPlan.missing.filter((s) => s.published),
        lessons: lessonPlan.missing.filter((l) => l.published),
        books: bookPlan.missing.filter((b) => b.published),
        tests: testPlan.missing.filter((t) => t.published),
        months: monthPlan.missing.filter((m) => m.published),
        notes: notePlan.missing.filter((n) => pushedMonths.has(n.monthRef)),
        questions: questionPlan.missing.filter((q) => !q.retired),
      }
    : { subjects: [], lessons: [], books: [], tests: [], months: [], notes: [], questions: [] }

  const summary: PushSummary = {
    subjects: counts(subjectPlan, { unpublished: prune.subjects.length }),
    sections: counts(sectionPlan),
    topics: counts(topicPlan),
    books: counts(bookPlan, { unpublished: prune.books.length }),
    chapters: counts(chapterPlan),
    lessons: counts(lessonPlan, { unpublished: prune.lessons.length }),
    categories: counts(categoryPlan),
    months: counts(monthPlan, { unpublished: prune.months.length }),
    notes: counts(notePlan, { removed: prune.notes.length }),
    questions: counts(questionPlan, { retired: prune.questions.length }),
    tests: counts(testPlan, { unpublished: prune.tests.length }),
  }
  if (opts.dry) return summary

  const now = new Date().toISOString()

  // Subjects
  const subjectRows = [...subjectPlan.create, ...subjectPlan.update]
  if (subjectRows.length) {
    must(await db.from('subjects').upsert(subjectRows.map((s) => ({ ...s, updated_at: now })), { onConflict: 'slug' }), 'write subjects')
  }
  const subjectId = new Map(
    (await selectAll((f, t) => db.from('subjects').select('id, slug').order('id').range(f, t), 'read subjects')).map((s) => [s.slug, s.id]),
  )
  const subjectSlugOf = new Map([...subjectId.entries()].map(([slug, id]) => [id, slug]))

  // Sections
  const sectionRows = [...sectionPlan.create, ...sectionPlan.update]
  if (sectionRows.length) {
    must(
      await db.from('sections').upsert(
        sectionRows.map(({ subjectSlug, ...s }) => ({ ...s, subject_id: subjectId.get(subjectSlug)!, updated_at: now })),
        { onConflict: 'subject_id,slug' },
      ),
      'write sections',
    )
  }
  const sectionId = new Map(
    (await selectAll((f, t) => db.from('sections').select('id, subject_id, slug').order('id').range(f, t), 'read sections')).map((s) => [`${subjectSlugOf.get(s.subject_id)}/${s.slug}`, s.id]),
  )

  // Topics: parents first (by depth), so every child can point at its parent.
  const topicRows = [...topicPlan.create, ...topicPlan.update].sort((a, b) => a.path.split('/').length - b.path.split('/').length)
  const readTopicIds = async () =>
    new Map(
      (await selectAll((f, t) => db.from('topics').select('id, path, subject_id').order('id').range(f, t), 'read topics')).map((t) => [
        `${subjectSlugOf.get(t.subject_id)}/${t.path}`,
        t.id,
      ]),
    )
  let topicId = await readTopicIds()
  const depths = [...new Set(topicRows.map((t) => t.path.split('/').length))].sort((a, b) => a - b)
  for (const depth of depths) {
    must(
      await db.from('topics').upsert(
        topicRows
          .filter((t) => t.path.split('/').length === depth)
          .map(({ subjectSlug, sectionSlug, parentPath, ...t }) => ({
            ...t,
            subject_id: subjectId.get(subjectSlug)!,
            parent_id: parentPath ? topicId.get(`${subjectSlug}/${parentPath}`)! : null,
            section_id: sectionSlug ? (sectionId.get(`${subjectSlug}/${sectionSlug}`) ?? null) : null,
            updated_at: now,
          })),
        { onConflict: 'subject_id,path' },
      ),
      'write topics',
    )
    topicId = await readTopicIds()
  }

  // Books (on subject nodes; published_at kept from the first time)
  const bookPublishedAt = new Map(existing.books.map((b) => [bookKey(b), b.published_at]))
  const bookRows = [...bookPlan.create, ...bookPlan.update]
  if (bookRows.length) {
    must(
      await db.from('books').upsert(
        bookRows.map(({ subjectSlug, topicPath, ...b }) => ({
          ...b,
          topic_id: topicId.get(`${subjectSlug}/${topicPath}`)!,
          published_at: bookPublishedAt.get(bookKey({ subjectSlug, topicPath, ...b })) ?? (b.published ? now : null),
          updated_at: now,
        })),
        { onConflict: 'topic_id,slug' },
      ),
      'write books',
    )
  }
  const topicRefOf = new Map([...topicId.entries()].map(([ref, id]) => [id, ref]))
  const bookId = new Map(
    (await selectAll((f, t) => db.from('books').select('id, topic_id, slug').order('id').range(f, t), 'read books')).map((b) => [
      `${topicRefOf.get(b.topic_id)}/${b.slug}`,
      b.id,
    ]),
  )

  // Chapters, then their syllabus tags (replaced for every written chapter)
  const chapterRows = [...chapterPlan.create, ...chapterPlan.update]
  if (chapterRows.length) {
    must(
      await db.from('book_chapters').upsert(
        chapterRows.map(({ bookRef, covers: _covers, ...c }) => ({ ...c, book_id: bookId.get(bookRef)!, updated_at: now })),
        { onConflict: 'book_id,slug' },
      ),
      'write chapters',
    )
  }
  const bookRefOf = new Map([...bookId.entries()].map(([ref, id]) => [id, ref]))
  const chapterId = new Map(
    (await selectAll((f, t) => db.from('book_chapters').select('id, book_id, slug').order('id').range(f, t), 'read chapters')).map((c) => [
      `${bookRefOf.get(c.book_id)}/${c.slug}`,
      c.id,
    ]),
  )
  for (const c of chapterRows) {
    const id = chapterId.get(chapterKey(c))!
    const [courseSlug] = splitRef(c.bookRef)
    must(await db.from('chapter_topics').delete().eq('chapter_id', id), 'clear chapter tags')
    if (c.covers.length) {
      must(
        await db.from('chapter_topics').insert(c.covers.map((p) => ({ chapter_id: id, topic_id: topicId.get(`${courseSlug}/${p}`)! }))),
        'write chapter tags',
      )
    }
  }

  // Categories
  const categoryRows = [...categoryPlan.create, ...categoryPlan.update]
  if (categoryRows.length) must(await db.from('ca_categories').upsert(categoryRows, { onConflict: 'slug' }), 'write categories')

  // Months (live on push; published_at kept from the first time)
  const monthPublishedAt = new Map(existing.months.map((m) => [monthKey(m), m.published_at]))
  const monthRows = [...monthPlan.create, ...monthPlan.update]
  if (monthRows.length) {
    must(
      await db.from('ca_months').upsert(
        monthRows.map((m) => ({
          section_id: sectionId.get(`${m.subjectSlug}/${m.sectionSlug}`)!,
          month: monthToDate(m.month),
          published: true,
          published_at: monthPublishedAt.get(monthKey(m)) ?? now,
          updated_at: now,
        })),
        { onConflict: 'section_id,month' },
      ),
      'write months',
    )
  }
  const sectionRef = new Map([...sectionId.entries()].map(([ref, id]) => [id, ref]))
  const monthId = new Map(
    (await selectAll((f, t) => db.from('ca_months').select('id, section_id, month').order('id').range(f, t), 'read months')).map((m) => [
      `${sectionRef.get(m.section_id)}/${dateToMonth(m.month)}`,
      m.id,
    ]),
  )

  // Notes
  const noteRows = [...notePlan.create, ...notePlan.update]
  if (noteRows.length) {
    must(
      await db.from('ca_notes').upsert(
        noteRows.map((n) => ({
          month_id: monthId.get(n.monthRef)!,
          category_slug: n.categorySlug,
          slug: n.slug,
          happened_on: n.happenedOn,
          body_md: n.body_md,
          angle_md: n.angle_md,
          position: n.position,
          updated_at: now,
        })),
        { onConflict: 'month_id,slug' },
      ),
      'write notes',
    )
  }

  // Lessons (published_at set the first time a lesson is pushed as published, then kept)
  const lessonPublishedAt = new Map(existing.lessons.map((l) => [lessonKey(l), l.published_at]))
  const lessonRows = [...lessonPlan.create, ...lessonPlan.update]
  if (lessonRows.length) {
    must(
      await db.from('lessons').upsert(
        lessonRows.map(({ subjectSlug, topicPath, ...l }) => ({
          ...l,
          topic_id: topicId.get(`${subjectSlug}/${topicPath}`)!,
          published_at: lessonPublishedAt.get(lessonKey({ subjectSlug, topicPath, ...l })) ?? (l.published ? now : null),
          updated_at: now,
        })),
        { onConflict: 'topic_id,slug' },
      ),
      'write lessons',
    )
  }

  // Questions: a topic question or a current-affairs question; every question in the files is live.
  const questionRows = [...questionPlan.create, ...questionPlan.update]
  if (questionRows.length) {
    must(
      await db.from('questions').upsert(
        questionRows.map((q) => ({
          slug: q.slug,
          topic_id: q.topicRef ? topicId.get(q.topicRef)! : null,
          ca_month_id: q.caMonthRef ? monthId.get(q.caMonthRef)! : null,
          ca_category_slug: q.categorySlug,
          chapter_id: q.chapterRef ? chapterId.get(q.chapterRef)! : null,
          retired: false,
          stem_md: q.stem_md,
          options: q.options as unknown as Json[],
          correct_key: q.correctKey,
          explanation_md: q.explanation_md,
          difficulty: q.difficulty,
          source: q.source,
          tags: q.tags,
          updated_at: now,
        })),
        { onConflict: 'slug' },
      ),
      'write questions',
    )
  }
  const questionId = new Map(
    (await selectAll((f, t) => db.from('questions').select('id, slug').order('id').range(f, t), 'read questions')).map((q) => [q.slug, q.id]),
  )

  // Tests (including each month's fixed paper) and their question lists
  const testPublishedAt = new Map(existing.tests.map((t) => [t.slug, t.published_at]))
  const testRows = [...testPlan.create, ...testPlan.update]
  if (testRows.length) {
    const written = must(
      await db
        .from('tests')
        .upsert(
          testRows.map((t) => ({
            slug: t.slug,
            title: t.title,
            kind: t.kind,
            subject_id: subjectId.get(t.subjectSlug)!,
            year: t.year,
            duration_sec: t.durationSec,
            marks_correct: t.marksCorrect,
            marks_wrong: t.marksWrong,
            published: t.published,
            published_at: testPublishedAt.get(t.slug) ?? (t.published ? now : null),
            ca_month_id: t.caMonthRef ? monthId.get(t.caMonthRef)! : null,
            chapter_id: t.chapterRef ? chapterId.get(t.chapterRef)! : null,
            updated_at: now,
          })),
          { onConflict: 'slug' },
        )
        .select('id, slug'),
      'write tests',
    )
    const testId = new Map(written.map((t) => [t.slug!, t.id]))
    for (const t of testRows) {
      // One transaction: a failure never leaves the test without questions.
      must(
        await db.rpc('replace_test_questions', {
          p_test_id: testId.get(t.slug)!,
          p_question_ids: t.questionSlugs.map((slug) => questionId.get(slug)!),
        }),
        `write questions of ${t.slug}`,
      )
    }
  }

  // Prune: unpublish or retire; only notes are deleted (nothing references them).
  if (prune.subjects.length) {
    must(await db.from('subjects').update({ published: false }).in('slug', prune.subjects.map((s) => s.slug)), 'unpublish subjects')
  }
  for (const l of prune.lessons) {
    must(
      await db.from('lessons').update({ published: false }).eq('topic_id', topicId.get(`${l.subjectSlug}/${l.topicPath}`)!).eq('slug', l.slug),
      'unpublish lessons',
    )
  }
  if (prune.tests.length) {
    must(await db.from('tests').update({ published: false }).in('slug', prune.tests.map((t) => t.slug)), 'unpublish tests')
  }
  for (const b of prune.books) {
    must(await db.from('books').update({ published: false }).eq('id', bookId.get(bookKey(b))!), 'unpublish books')
  }
  for (const m of prune.months) {
    must(await db.from('ca_months').update({ published: false }).eq('id', monthId.get(monthKey(m))!), 'unpublish months')
  }
  for (const n of prune.notes) {
    must(await db.from('ca_notes').delete().eq('month_id', monthId.get(n.monthRef)!).eq('slug', n.slug), 'remove notes')
  }
  for (const slugs of chunk(prune.questions.map((q) => q.slug), 100)) {
    must(await db.from('questions').update({ retired: true }).in('slug', slugs), 'retire questions')
  }

  return summary
}
