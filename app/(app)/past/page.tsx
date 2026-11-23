import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, FileClock, History } from 'lucide-react'
import { listMyAttempts, listTests } from '@/lib/queries/tests'
import { PageHeader } from '@/components/page-header'
import { Panel, Mono } from '@/components/surfaces'
import { EmptyState } from '@/components/empty-state'
import { TestList } from '@/components/tests/test-list'
import { AttemptList } from '@/components/tests/attempt-list'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Past tests' }

export default async function PastPage({ searchParams }: PageProps<'/past'>) {
  const sp = await searchParams
  const page = Math.max(1, Number.parseInt(typeof sp.page === 'string' ? sp.page : '1', 10) || 1)
  const [papers, attempts] = await Promise.all([listTests('pyq'), listMyAttempts(page)])

  return (
    <>
      <PageHeader title="Past tests" description="Previous-year papers to attempt, and every test you have taken." />

      <section aria-labelledby="papers" className="mb-8">
        <h2 id="papers" className="mb-3 text-lg font-semibold">
          Previous-year papers
        </h2>
        <Panel>
          <TestList
            tests={papers}
            empty={
              <EmptyState icon={<FileClock />} title="No papers yet">
                Previous-year papers appear here as soon as they are added.
              </EmptyState>
            }
          />
        </Panel>
      </section>

      <section aria-labelledby="mine">
        <h2 id="mine" className="mb-3 text-lg font-semibold">
          My attempts
        </h2>
        <Panel>
          {attempts.rows.length === 0 && page === 1 ? (
            <EmptyState
              icon={<History />}
              title="No attempts yet"
              action={
                <Button asChild>
                  <Link href="/tests">Take your first test</Link>
                </Button>
              }
            >
              Every test you submit shows up here with its score and a full review.
            </EmptyState>
          ) : (
            <>
              <AttemptList rows={attempts.rows} />
              {(page > 1 || attempts.hasMore) && (
                <nav aria-label="Pages" className="mt-4 flex items-center justify-between border-t border-hairline pt-4">
                  <p className="text-[13px] text-muted-foreground">
                    Page <Mono>{page}</Mono>
                  </p>
                  <div className="flex gap-2">
                    {page > 1 && (
                      <Button variant="secondary" size="sm" asChild>
                        <Link href={`/past?page=${page - 1}`}>
                          <ArrowLeft />
                          Newer
                        </Link>
                      </Button>
                    )}
                    {attempts.hasMore && (
                      <Button size="sm" asChild>
                        <Link href={`/past?page=${page + 1}`}>
                          Older
                          <ArrowRight />
                        </Link>
                      </Button>
                    )}
                  </div>
                </nav>
              )}
            </>
          )}
        </Panel>
      </section>
    </>
  )
}
