import type { Metadata } from 'next'
import Link from 'next/link'
import { GraduationCap, Library } from 'lucide-react'
import { listCourses } from '@/lib/queries/courses'
import { PageHeader } from '@/components/page-header'
import { Panel, IconTile, Mono } from '@/components/surfaces'
import { EmptyState } from '@/components/empty-state'

export const metadata: Metadata = { title: 'Courses' }

export default async function CoursesPage() {
  const courses = await listCourses()
  return (
    <>
      <PageHeader title="Courses" description="Pick a course, then a subject. Read the notes and book gists, then practise." />
      {courses.length === 0 ? (
        <Panel>
          <EmptyState icon={<Library />} title="No courses yet">
            Courses appear here as soon as material is added.
          </EmptyState>
        </Panel>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <Link key={c.slug} href={`/courses/${c.slug}`} className="focus-ring group rounded-panel">
              <Panel className="flex h-full flex-col gap-3 transition-colors group-hover:border-primary/40">
                <IconTile>
                  <GraduationCap />
                </IconTile>
                <h2 className="text-lg font-semibold">{c.name}</h2>
                {c.description && <p className="text-sm text-muted-foreground">{c.description}</p>}
                <p className="mt-auto text-[13px] text-muted-foreground">
                  <Mono>{c.subjectCount}</Mono> {c.subjectCount === 1 ? 'subject' : 'subjects'} · <Mono>{c.lessonCount}</Mono>{' '}
                  {c.lessonCount === 1 ? 'lesson' : 'lessons'} · <Mono>{c.bookCount}</Mono> {c.bookCount === 1 ? 'book' : 'books'}
                </p>
              </Panel>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
