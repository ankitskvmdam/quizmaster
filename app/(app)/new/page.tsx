import type { Metadata } from 'next'
import Link from 'next/link'
import { BookOpen, CalendarDays, ClipboardList, Library, Sparkles } from 'lucide-react'
import { getBuilderTopics, getFeed } from '@/lib/queries/home'
import { formatDate } from '@/lib/format'
import { PageHeader } from '@/components/page-header'
import { Panel, IconTile, Mono } from '@/components/surfaces'
import { Badge } from '@/components/badge'
import { EmptyState } from '@/components/empty-state'
import { TestBuilder } from '@/components/new/test-builder'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'New' }

export default async function NewPage() {
  const [topics, feed] = await Promise.all([getBuilderTopics(), getFeed(20)])
  return (
    <>
      <PageHeader title="New" description="Build your own test, and see what was added recently." />

      <section aria-labelledby="build" className="mb-8">
        <Panel className="flex flex-col gap-5">
          <h2 id="build" className="text-lg font-semibold">
            Build a test
          </h2>
          {topics.length === 0 ? (
            <p className="text-sm text-muted-foreground">There are no practice questions yet.</p>
          ) : (
            <TestBuilder topics={topics} />
          )}
        </Panel>
      </section>

      <section aria-labelledby="feed">
        <h2 id="feed" className="mb-3 text-lg font-semibold">
          What&apos;s new
        </h2>
        <Panel>
          {feed.length === 0 ? (
            <EmptyState icon={<Sparkles />} title="Nothing new yet">
              New notes, books and tests appear here as they are added.
            </EmptyState>
          ) : (
            <ul className="-my-2 flex flex-col">
              {feed.map((item, i) => (
                <li key={`${item.type}-${item.href}-${item.title}`} className={cn(i > 0 && 'border-t border-hairline')}>
                  <Link href={item.href} className="focus-ring -mx-2 flex items-center gap-4 rounded-lg px-2 py-3 hover:bg-soft">
                    <IconTile size="sm">{item.type === 'lesson' ? <BookOpen /> : item.type === 'book' ? <Library /> : item.type === 'month' ? <CalendarDays /> : <ClipboardList />}</IconTile>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 font-medium">
                        <span className="truncate">{item.title}</span>
                        {item.isNew && <Badge tone="primary">New</Badge>}
                      </p>
                      <p className="truncate text-[13px] text-muted-foreground">{item.where}</p>
                    </div>
                    <Mono className="hidden shrink-0 text-[13px] text-muted-foreground sm:block">{formatDate(item.publishedAt)}</Mono>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>
    </>
  )
}
