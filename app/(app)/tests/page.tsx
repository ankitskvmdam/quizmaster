import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight, ClipboardList, FileClock } from 'lucide-react'
import { listExams, listTests } from '@/lib/queries/tests'
import { PageHeader } from '@/components/page-header'
import { Panel, IconTile, Mono } from '@/components/surfaces'
import { EmptyState } from '@/components/empty-state'
import { TestList } from '@/components/tests/test-list'

export const metadata: Metadata = { title: 'Tests' }

/** Exams first (each opens its previous-year papers), then any mock tests. */
export default async function TestsPage() {
  const [exams, mocks] = await Promise.all([listExams(), listTests('mock')])
  return (
    <>
      <PageHeader
        title="Tests"
        description="Previous year papers (PYQ) by exam. Take one against the clock, or practise it with explanations as you go."
      />

      {exams.length === 0 && mocks.length === 0 && (
        <Panel>
          <EmptyState icon={<ClipboardList />} title="No tests yet">
            Previous year papers and mock tests appear here as soon as they are added.
          </EmptyState>
        </Panel>
      )}

      {exams.length > 0 && (
        <section aria-labelledby="exams" className="mb-8">
          <h2 id="exams" className="mb-3 text-lg font-semibold">
            Previous Year Papers (PYQ)
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {exams.map((e) => (
              <Link key={e.slug} href={`/tests/${e.slug}`} className="focus-ring group rounded-panel">
                <Panel className="flex h-full flex-col gap-3 transition-colors group-hover:border-primary/40">
                  <div className="flex items-start justify-between gap-3">
                    <IconTile>
                      <FileClock />
                    </IconTile>
                    <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{e.name}</h3>
                    {e.description && <p className="text-sm text-muted-foreground">{e.description}</p>}
                  </div>
                  <p className="mt-auto text-[13px] text-muted-foreground">
                    {e.paperCount === 0 ? (
                      'Papers coming soon'
                    ) : (
                      <>
                        <Mono>{e.paperCount}</Mono> {e.paperCount === 1 ? 'paper' : 'papers'}
                        {e.firstYear && e.lastYear && (
                          <>
                            {' '}
                            · <Mono>{e.firstYear === e.lastYear ? e.firstYear : `${e.firstYear}–${e.lastYear}`}</Mono>
                          </>
                        )}
                      </>
                    )}
                  </p>
                </Panel>
              </Link>
            ))}
          </div>
        </section>
      )}

      {mocks.length > 0 && (
        <section aria-labelledby="mocks">
          <h2 id="mocks" className="mb-3 text-lg font-semibold">
            Mock tests
          </h2>
          <Panel>
            <TestList tests={mocks} empty={null} />
          </Panel>
        </section>
      )}
    </>
  )
}
