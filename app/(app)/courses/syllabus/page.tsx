import type { Metadata } from 'next'
import Link from 'next/link'
import { ListTree } from 'lucide-react'
import { listExams } from '@/lib/queries/tests'
import { loadSyllabus } from '@/lib/syllabus'
import { PageHeader } from '@/components/page-header'
import { Panel, IconTile, Mono } from '@/components/surfaces'
import { EmptyState } from '@/components/empty-state'
import { Breadcrumbs } from '@/components/courses/crumbs'

export const metadata: Metadata = { title: 'Syllabus' }

/** Every exam that has a syllabus, each opening what its previous-year papers ask. */
export default async function SyllabusIndexPage() {
  const exams = await listExams()
  const rows = (await Promise.all(exams.map(async (e) => ({ exam: e, syllabus: await loadSyllabus(e.slug) })))).flatMap((r) =>
    r.syllabus ? [{ exam: r.exam, syllabus: r.syllabus }] : [],
  )

  return (
    <>
      <Breadcrumbs items={[]} current="Syllabus" />
      <PageHeader title="Syllabus" description="What each exam asks, worked out from its previous-year papers: subjects by weight, then the chapters that come up most." />
      {rows.length === 0 ? (
        <Panel>
          <EmptyState icon={<ListTree />} title="No syllabus yet">
            An exam&apos;s syllabus appears here once its previous-year papers have been analysed.
          </EmptyState>
        </Panel>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(({ exam, syllabus }) => {
            const chapters = syllabus.subjects.reduce((n, s) => n + s.topics.reduce((m, t) => m + t.chapters.length, 0), 0)
            return (
              <Link key={exam.slug} href={`/courses/syllabus/${exam.slug}`} className="focus-ring group rounded-panel">
                <Panel className="flex h-full flex-col gap-3 transition-colors group-hover:border-primary/40">
                  <IconTile>
                    <ListTree />
                  </IconTile>
                  <h2 className="text-lg font-semibold">{exam.name}</h2>
                  <p className="mt-auto text-[13px] text-muted-foreground">
                    <Mono>{syllabus.subjects.length}</Mono> subjects · <Mono>{chapters}</Mono> chapters · from <Mono>{syllabus.papers}</Mono>{' '}
                    {syllabus.papers === 1 ? 'paper' : 'papers'}
                  </p>
                </Panel>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
