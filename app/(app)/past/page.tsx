import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, History } from 'lucide-react'
import { listMyAttempts } from '@/lib/queries/tests'
import { PageHeader } from '@/components/page-header'
import { Panel, Mono } from '@/components/surfaces'
import { EmptyState } from '@/components/empty-state'
import { AttemptList } from '@/components/tests/attempt-list'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'My Attempts' }

export default async function PastPage({ searchParams }: PageProps<'/past'>) {
  const sp = await searchParams
  const page = Math.max(1, Number.parseInt(typeof sp.page === 'string' ? sp.page : '1', 10) || 1)
  const attempts = await listMyAttempts(page)

  return (
    <>
      <PageHeader title="My Attempts" description="Every test you have taken, with a full review." />

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
