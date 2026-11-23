import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BookOpen, Check, Dumbbell } from 'lucide-react'
import { getTopic } from '@/lib/queries/content'
import { startTopicPractice } from '@/app/(app)/actions'
import { PageHeader } from '@/components/page-header'
import { Panel, Mono } from '@/components/surfaces'
import { EmptyState } from '@/components/empty-state'
import { ActionButton } from '@/components/action-button'
import { cn } from '@/lib/utils'

export async function generateMetadata({ params }: PageProps<'/subjects/[subject]/[topic]'>): Promise<Metadata> {
  const p = await params
  const data = await getTopic(p.subject, p.topic)
  return { title: data?.topic.name ?? 'Topic' }
}

export default async function TopicPage({ params }: PageProps<'/subjects/[subject]/[topic]'>) {
  const p = await params
  const data = await getTopic(p.subject, p.topic)
  if (!data) notFound()
  const { topic, subject, lessons } = data
  const base = `/subjects/${subject.slug}/${topic.slug}`

  return (
    <>
      <PageHeader
        eyebrow={
          <Link href={`/subjects/${subject.slug}`} className="hover:underline">
            {subject.name}
          </Link>
        }
        title={topic.name}
        description={topic.description}
        actions={
          topic.questionCount > 0 ? (
            <ActionButton variant="secondary" action={startTopicPractice.bind(null, topic.id)}>
              <Dumbbell />
              Practice this topic
            </ActionButton>
          ) : undefined
        }
      />
      <Panel>
        {lessons.length === 0 ? (
          <EmptyState icon={<BookOpen />} title="No lessons yet">
            Lessons for {topic.name} appear here as soon as they are added.
          </EmptyState>
        ) : (
          <ol className="-my-2 flex flex-col">
            {lessons.map((l, i) => (
              <li key={l.slug} className={cn(i > 0 && 'border-t border-hairline')}>
                <Link
                  href={`${base}/${l.slug}`}
                  className="focus-ring -mx-2 flex items-center gap-4 rounded-lg px-2 py-3.5 hover:bg-soft"
                >
                  <Mono className="w-6 text-sm text-muted-foreground">{String(i + 1).padStart(2, '0')}</Mono>
                  <span className="flex-1 font-medium">{l.title}</span>
                  {l.done && (
                    <span className="flex items-center gap-1 text-[13px] text-correct-fg">
                      <Check className="size-4" aria-hidden />
                      Done
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </>
  )
}
