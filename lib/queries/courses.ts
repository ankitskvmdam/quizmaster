import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { selectAll } from '@/lib/content/select-all'
import { buildTree, type Tree } from '@/lib/courses/tree'

function fail(what: string, error: { message: string } | null): never {
  throw new Error(`Could not load ${what}${error ? `: ${error.message}` : ''}`)
}

export type CourseCard = { slug: string; name: string; description: string; subjectCount: number; lessonCount: number; bookCount: number }

/** Every published course (the `subjects` table holds courses). */
export async function listCourses(): Promise<CourseCard[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('subjects')
    .select('slug, name, description, topics(id, parent_id, lessons(id), books(id))')
    .order('position')
  if (error) fail('courses', error)
  return data.map((c) => ({
    slug: c.slug,
    name: c.name,
    description: c.description,
    subjectCount: c.topics.filter((t) => t.parent_id === null).length,
    lessonCount: c.topics.reduce((n, t) => n + t.lessons.length, 0),
    bookCount: c.topics.reduce((n, t) => n + t.books.length, 0),
  }))
}

export type Course = { id: string; slug: string; name: string; description: string; tree: Tree }

/** A course and its whole syllabus tree with the signed-in person's progress. Cached per request. */
export const getCourse = cache(async (courseSlug: string): Promise<Course | null> => {
  const supabase = await createClient()
  const { data: course, error } = await supabase.from('subjects').select('id, slug, name, description').eq('slug', courseSlug).maybeSingle()
  if (error) fail('course', error)
  if (!course) return null

  const [topics, lessons, done, books] = await Promise.all([
    selectAll(
      (f, t) =>
        supabase.from('topics').select('id, parent_id, path, slug, name, description, position').eq('subject_id', course.id).order('id').range(f, t),
      'read topics',
    ),
    selectAll(
      (f, t) =>
        supabase
          .from('lessons')
          .select('id, topic_id, slug, title, position, topics!inner(subject_id)')
          .eq('topics.subject_id', course.id)
          .order('id')
          .range(f, t),
      'read lessons',
    ),
    selectAll((f, t) => supabase.from('lesson_progress').select('lesson_id').order('lesson_id').range(f, t), 'read progress'),
    selectAll(
      (f, t) =>
        supabase
          .from('books')
          .select('id, topic_id, slug, title, author, edition, description, position, topics!inner(subject_id)')
          .eq('topics.subject_id', course.id)
          .order('id')
          .range(f, t),
      'read books',
    ),
  ])
  const bookIds = books.map((b) => b.id)
  const topicIds = topics.map((t) => t.id)
  const [chapters, tags, read, topicQuestions, chapterQuestions] = await Promise.all([
    bookIds.length
      ? selectAll((f, t) => supabase.from('book_chapters').select('id, book_id, slug, number, title').in('book_id', bookIds).order('id').range(f, t), 'read chapters')
      : [],
    bookIds.length
      ? selectAll(
          (f, t) =>
            supabase.from('chapter_topics').select('chapter_id, topic_id, book_chapters!inner(book_id)').in('book_chapters.book_id', bookIds).order('chapter_id').range(f, t),
          'read chapter tags',
        )
      : [],
    selectAll((f, t) => supabase.from('chapter_progress').select('chapter_id').order('chapter_id').range(f, t), 'read chapter progress'),
    topicIds.length
      ? selectAll(
          (f, t) => supabase.from('questions').select('id, topic_id').in('topic_id', topicIds).eq('retired', false).order('id').range(f, t),
          'read questions',
        )
      : [],
    bookIds.length
      ? selectAll(
          (f, t) =>
            supabase
              .from('questions')
              .select('id, chapter_id, book_chapters!inner(book_id)')
              .in('book_chapters.book_id', bookIds)
              .eq('retired', false)
              .order('id')
              .range(f, t),
          'read chapter questions',
        )
      : [],
  ])

  const doneIds = new Set(done.map((d) => d.lesson_id))
  const readIds = new Set(read.map((r) => r.chapter_id))
  const tree = buildTree({
    topics: topics.map((t) => ({ id: t.id, parentId: t.parent_id, path: t.path, slug: t.slug, name: t.name, description: t.description, position: t.position })),
    lessons: lessons.map((l) => ({ id: l.id, topicId: l.topic_id, slug: l.slug, title: l.title, position: l.position, done: doneIds.has(l.id) })),
    questions: [
      ...topicQuestions.map((q) => ({ topicId: q.topic_id, chapterId: null })),
      ...chapterQuestions.map((q) => ({ topicId: null, chapterId: q.chapter_id })),
    ],
    books: books.map((b) => ({
      id: b.id,
      topicId: b.topic_id,
      slug: b.slug,
      title: b.title,
      author: b.author,
      edition: b.edition,
      description: b.description,
      position: b.position,
    })),
    chapters: chapters.map((c) => ({
      id: c.id,
      bookId: c.book_id,
      slug: c.slug,
      number: c.number,
      title: c.title,
      read: readIds.has(c.id),
      coverIds: tags.filter((t) => t.chapter_id === c.id).map((t) => t.topic_id),
    })),
  })
  return { id: course.id, slug: course.slug, name: course.name, description: course.description, tree }
})

export async function getLessonBody(lessonId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('lessons').select('id, title, body_md').eq('id', lessonId).single()
  if (error) fail('lesson', error)
  return data
}

/** A chapter's gist and its quiz (the kind='chapter' test) with the person's best score. */
export async function getChapterDetail(chapterId: string) {
  const supabase = await createClient()
  const [{ data: ch, error }, { data: quiz }] = await Promise.all([
    supabase.from('book_chapters').select('id, title, gist_md').eq('id', chapterId).single(),
    supabase.from('tests').select('id, test_questions(count)').eq('chapter_id', chapterId).eq('kind', 'chapter').maybeSingle(),
  ])
  if (error) fail('chapter', error)
  let bestScore: number | null = null
  if (quiz) {
    const { data: attempts } = await supabase.from('attempts').select('score, n_correct, n_wrong, n_skipped').eq('test_id', quiz.id).not('submitted_at', 'is', null)
    const scores = (attempts ?? []).map((a) => Number(a.score)).filter((s) => !Number.isNaN(s))
    bestScore = scores.length ? Math.max(...scores) : null
  }
  return {
    ...ch,
    quiz: quiz ? { testId: quiz.id, questionCount: quiz.test_questions[0]?.count ?? 0, bestScore } : null,
  }
}

/** Best quiz score per chapter of a book, for the chapter list. */
export async function getBookQuizScores(chapterIds: string[]): Promise<Map<string, { testId: string; best: number | null; questionCount: number }>> {
  if (!chapterIds.length) return new Map()
  const supabase = await createClient()
  const { data: quizzes, error } = await supabase
    .from('tests')
    .select('id, chapter_id, test_questions(count), attempts(score, submitted_at)')
    .in('chapter_id', chapterIds)
    .eq('kind', 'chapter')
  if (error) fail('chapter quizzes', error)
  return new Map(
    quizzes.map((q) => {
      const scores = q.attempts.filter((a) => a.submitted_at).map((a) => Number(a.score))
      return [q.chapter_id!, { testId: q.id, best: scores.length ? Math.max(...scores) : null, questionCount: q.test_questions[0]?.count ?? 0 }]
    }),
  )
}
