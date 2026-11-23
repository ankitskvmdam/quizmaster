import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/lib/supabase/database.types'
import type { ContentBundle, LessonItem, QuestionItem, SubjectItem, TestItem, TopicItem } from './load'
import { planChanges, type Plan } from './plan'

type Db = SupabaseClient<Database>
type Counts = { created: number; updated: number; unchanged: number; unpublished: number }
export type PushSummary = Record<'subjects' | 'topics' | 'lessons' | 'questions' | 'tests', Counts>

const counts = <T>(p: Plan<T>, unpublished = 0): Counts => ({
  created: p.create.length,
  updated: p.update.length,
  unchanged: p.unchanged.length,
  unpublished,
})

function must<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`)
  return res.data as T
}

/** Everything in the database that came from content files, keyed by slugs (never ids). */
async function readExisting(db: Db) {
  const subjects = must(await db.from('subjects').select('id, slug, name, description, position, published'), 'read subjects')
  const topics = must(await db.from('topics').select('id, subject_id, slug, name, description, position'), 'read topics')
  const lessons = must(
    await db.from('lessons').select('id, topic_id, slug, title, body_md, position, published, published_at'),
    'read lessons',
  )
  const questions = must(
    await db
      .from('questions')
      .select('id, slug, topic_id, stem_md, options, correct_key, explanation_md, difficulty, source, tags'),
    'read questions',
  )
  const tests = must(
    await db
      .from('tests')
      .select('id, slug, title, kind, subject_id, year, duration_sec, marks_correct, marks_wrong, published, published_at')
      .is('created_by', null)
      .not('slug', 'is', null),
    'read tests',
  )
  const testQuestions = must(await db.from('test_questions').select('test_id, question_id, position'), 'read test questions')

  const subjectSlug = new Map(subjects.map((s) => [s.id, s.slug]))
  const topicRef = new Map(topics.map((t) => [t.id, `${subjectSlug.get(t.subject_id)}/${t.slug}`]))
  const questionSlug = new Map(questions.map((q) => [q.id, q.slug]))

  return {
    subjects: subjects.map((s): SubjectItem & { id: string } => ({ ...s })),
    topics: topics.map((t): TopicItem & { id: string } => ({
      id: t.id,
      subjectSlug: subjectSlug.get(t.subject_id)!,
      slug: t.slug,
      name: t.name,
      description: t.description,
      position: t.position,
    })),
    lessons: lessons.map((l): LessonItem & { id: string; published_at: string | null } => {
      const [s, t] = topicRef.get(l.topic_id)!.split('/')
      return {
        id: l.id,
        subjectSlug: s,
        topicSlug: t,
        slug: l.slug,
        title: l.title,
        position: l.position,
        published: l.published,
        body_md: l.body_md,
        published_at: l.published_at,
      }
    }),
    questions: questions.map((q): QuestionItem & { id: string } => ({
      id: q.id,
      slug: q.slug,
      topicRef: topicRef.get(q.topic_id)!,
      stem_md: q.stem_md,
      options: q.options as QuestionItem['options'],
      correctKey: q.correct_key,
      explanation_md: q.explanation_md,
      difficulty: q.difficulty,
      source: q.source,
      tags: q.tags,
    })),
    tests: tests.map((t): TestItem & { id: string; published_at: string | null } => ({
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
      questionSlugs: testQuestions
        .filter((tq) => tq.test_id === t.id)
        .sort((a, b) => a.position - b.position)
        .map((tq) => questionSlug.get(tq.question_id)!),
    })),
  }
}

const lessonKey = (l: LessonItem) => `${l.subjectSlug}/${l.topicSlug}/${l.slug}`
const topicKey = (t: TopicItem) => `${t.subjectSlug}/${t.slug}`

/** Upserts the bundle by slug. Never deletes; with prune, unpublishes subjects, lessons and tests the files dropped. */
export async function pushContent(
  bundle: ContentBundle,
  db: Db,
  opts: { dry: boolean; prune: boolean },
): Promise<PushSummary> {
  const existing = await readExisting(db)
  const strip = <T extends object>(x: T) => {
    const { id: _id, published_at: _p, ...rest } = x as T & { id?: string; published_at?: string | null }
    return rest
  }

  const subjectPlan = planChanges(existing.subjects.map(strip), bundle.subjects, (s) => s.slug, (s) => s)
  const topicPlan = planChanges(existing.topics.map(strip), bundle.topics, topicKey, (t) => t)
  const lessonPlan = planChanges(existing.lessons.map(strip), bundle.lessons, lessonKey, (l) => l)
  const questionPlan = planChanges(existing.questions.map(strip), bundle.questions, (q) => q.slug, (q) => q)
  const testPlan = planChanges(existing.tests.map(strip), bundle.tests, (t) => t.slug, (t) => t)

  const toUnpublish = opts.prune
    ? {
        subjects: subjectPlan.missing.filter((s) => s.published),
        lessons: lessonPlan.missing.filter((l) => l.published),
        tests: testPlan.missing.filter((t) => t.published),
      }
    : { subjects: [], lessons: [], tests: [] }

  const summary: PushSummary = {
    subjects: counts(subjectPlan, toUnpublish.subjects.length),
    topics: counts(topicPlan),
    lessons: counts(lessonPlan, toUnpublish.lessons.length),
    questions: counts(questionPlan),
    tests: counts(testPlan, toUnpublish.tests.length),
  }
  if (opts.dry) return summary

  const now = new Date().toISOString()

  // Subjects
  const subjectRows = [...subjectPlan.create, ...subjectPlan.update]
  if (subjectRows.length) {
    must(await db.from('subjects').upsert(subjectRows.map((s) => ({ ...s, updated_at: now })), { onConflict: 'slug' }), 'write subjects')
  }
  const subjectId = new Map(
    must(await db.from('subjects').select('id, slug'), 'read subjects').map((s) => [s.slug, s.id]),
  )

  // Topics
  const topicRows = [...topicPlan.create, ...topicPlan.update]
  if (topicRows.length) {
    must(
      await db.from('topics').upsert(
        topicRows.map(({ subjectSlug, ...t }) => ({ ...t, subject_id: subjectId.get(subjectSlug)!, updated_at: now })),
        { onConflict: 'subject_id,slug' },
      ),
      'write topics',
    )
  }
  const topicId = new Map(
    must(await db.from('topics').select('id, slug, subject_id'), 'read topics').map((t) => {
      const sSlug = [...subjectId.entries()].find(([, id]) => id === t.subject_id)?.[0]
      return [`${sSlug}/${t.slug}`, t.id]
    }),
  )

  // Lessons (published_at set the first time a lesson is pushed as published, then kept)
  const lessonPublishedAt = new Map(existing.lessons.map((l) => [lessonKey(l), l.published_at]))
  const lessonRows = [...lessonPlan.create, ...lessonPlan.update]
  if (lessonRows.length) {
    must(
      await db.from('lessons').upsert(
        lessonRows.map(({ subjectSlug, topicSlug, ...l }) => ({
          ...l,
          topic_id: topicId.get(`${subjectSlug}/${topicSlug}`)!,
          published_at: lessonPublishedAt.get(lessonKey({ subjectSlug, topicSlug, ...l })) ?? (l.published ? now : null),
          updated_at: now,
        })),
        { onConflict: 'topic_id,slug' },
      ),
      'write lessons',
    )
  }

  // Questions
  const questionRows = [...questionPlan.create, ...questionPlan.update]
  if (questionRows.length) {
    must(
      await db.from('questions').upsert(
        questionRows.map((q) => ({
          slug: q.slug,
          topic_id: topicId.get(q.topicRef)!,
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
  const questionId = new Map(must(await db.from('questions').select('id, slug'), 'read questions').map((q) => [q.slug, q.id]))

  // Tests and their question lists
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
            updated_at: now,
          })),
          { onConflict: 'slug' },
        )
        .select('id, slug'),
      'write tests',
    )
    const testId = new Map(written.map((t) => [t.slug!, t.id]))
    for (const t of testRows) {
      const id = testId.get(t.slug)!
      must(await db.from('test_questions').delete().eq('test_id', id), `clear questions of ${t.slug}`)
      must(
        await db.from('test_questions').insert(
          t.questionSlugs.map((slug, i) => ({ test_id: id, question_id: questionId.get(slug)!, position: i + 1 })),
        ),
        `write questions of ${t.slug}`,
      )
    }
  }

  // Prune: unpublish, never delete (attempts may reference them)
  if (toUnpublish.subjects.length) {
    must(await db.from('subjects').update({ published: false }).in('slug', toUnpublish.subjects.map((s) => s.slug)), 'unpublish subjects')
  }
  for (const l of toUnpublish.lessons) {
    must(
      await db.from('lessons').update({ published: false }).eq('topic_id', topicId.get(`${l.subjectSlug}/${l.topicSlug}`)!).eq('slug', l.slug),
      'unpublish lessons',
    )
  }
  if (toUnpublish.tests.length) {
    must(await db.from('tests').update({ published: false }).in('slug', toUnpublish.tests.map((t) => t.slug)), 'unpublish tests')
  }

  return summary
}
