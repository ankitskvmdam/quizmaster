import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getBookQuiz, getBookQuizScores, getChapterDetail, getCourse, getLessonBody } from '@/lib/queries/courses'
import { resolvePath } from '@/lib/courses/tree'
import { BookView, ChapterView, LessonView, NodeView } from '@/components/courses/views'

type Props = PageProps<'/courses/[course]/[...path]'>

async function load(params: Props['params']) {
  const { course: courseSlug, path } = await params
  const course = await getCourse(courseSlug)
  if (!course) return null
  const resolved = resolvePath(course.tree, path.map(decodeURIComponent))
  return resolved ? { course, resolved } : null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await load(params)
  if (!data) return { title: 'Not found' }
  const r = data.resolved
  const title =
    r.kind === 'node' ? r.node.name : r.kind === 'lesson' ? r.lesson.title : r.kind === 'book' ? r.book.title : `${r.chapter.title} · ${r.book.title}`
  return { title }
}

/** Everything under a course: a syllabus node, a lesson, a book, or a book chapter. */
export default async function CoursePathPage({ params }: Props) {
  const data = await load(params)
  if (!data) notFound()
  const { course, resolved: r } = data
  const ctx = { courseSlug: course.slug, courseName: course.name, tree: course.tree }

  switch (r.kind) {
    case 'node':
      return <NodeView ctx={ctx} node={r.node} />
    case 'lesson': {
      const lesson = await getLessonBody(r.lesson.id)
      return <LessonView ctx={ctx} node={r.node} lesson={r.lesson} body={lesson.body_md} prev={r.prev} next={r.next} />
    }
    case 'book': {
      const [quizzes, wholeQuiz] = await Promise.all([getBookQuizScores(r.book.chapters.map((c) => c.id)), getBookQuiz(r.book.id)])
      return <BookView ctx={ctx} subject={r.subject} book={r.book} quizzes={quizzes} wholeQuiz={wholeQuiz} />
    }
    case 'chapter': {
      const detail = await getChapterDetail(r.chapter.id)
      return (
        <ChapterView
          ctx={ctx}
          subject={r.subject}
          book={r.book}
          chapter={r.chapter}
          gist={detail.gist_md}
          quiz={detail.quiz}
          prev={r.prev}
          next={r.next}
        />
      )
    }
  }
}
