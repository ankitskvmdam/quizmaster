import type { Metadata } from 'next'
import Link from 'next/link'
import { Calculator, Library } from 'lucide-react'
import { listSubjects } from '@/lib/queries/content'
import { PageHeader } from '@/components/page-header'
import { Panel, IconTile, Mono } from '@/components/surfaces'
import { EmptyState } from '@/components/empty-state'

export const metadata: Metadata = { title: 'Subjects' }

export default async function SubjectsPage() {
  const subjects = await listSubjects()
  return (
    <>
      <PageHeader title="Subjects" description="Pick a subject, then a topic. Each topic has short lessons and practice." />
      {subjects.length === 0 ? (
        <Panel>
          <EmptyState icon={<Library />} title="No subjects yet">
            Subjects appear here as soon as material is added.
          </EmptyState>
        </Panel>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((s) => (
            <Link key={s.slug} href={`/subjects/${s.slug}`} className="focus-ring group rounded-panel">
              <Panel className="flex h-full flex-col gap-3 transition-colors group-hover:border-primary/40">
                <IconTile>
                  <Calculator />
                </IconTile>
                <h2 className="text-lg font-semibold">{s.name}</h2>
                <p className="text-sm text-muted-foreground">{s.description}</p>
                <p className="mt-auto text-[13px] text-muted-foreground">
                  <Mono>{s.topicCount}</Mono> {s.topicCount === 1 ? 'topic' : 'topics'} · <Mono>{s.lessonCount}</Mono>{' '}
                  {s.lessonCount === 1 ? 'lesson' : 'lessons'}
                </p>
              </Panel>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
