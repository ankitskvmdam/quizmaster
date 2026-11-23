import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BookOpen } from 'lucide-react'
import { getCourse } from '@/lib/queries/courses'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/surfaces'
import { EmptyState } from '@/components/empty-state'
import { NodeCard } from '@/components/courses/node-card'
import { Breadcrumbs } from '@/components/courses/crumbs'

type Props = PageProps<'/courses/[course]'>

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const course = await getCourse((await params).course)
  return { title: course?.name ?? 'Course' }
}

/** A course: its subjects (the top-level nodes of the syllabus tree). */
export default async function CoursePage({ params }: Props) {
  const course = await getCourse((await params).course)
  if (!course) notFound()
  const subjects = course.tree.roots

  return (
    <>
      <Breadcrumbs items={[]} current={course.name} />
      <PageHeader title={course.name} description={course.description} />
      {subjects.length === 0 ? (
        <Panel>
          <EmptyState icon={<BookOpen />} title="No subjects yet">
            Subjects for {course.name} appear here as soon as they are added.
          </EmptyState>
        </Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {subjects.map((s) => (
            <NodeCard key={s.id} href={`/courses/${course.slug}/${s.path}`} node={s} />
          ))}
        </div>
      )}
    </>
  )
}
