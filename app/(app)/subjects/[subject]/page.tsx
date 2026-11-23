import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BookOpen, ChevronRight } from 'lucide-react'
import { getSubject } from '@/lib/queries/content'
import { PageHeader } from '@/components/page-header'
import { Panel, Mono } from '@/components/surfaces'
import { ProgressBar } from '@/components/progress-bar'
import { EmptyState } from '@/components/empty-state'

export async function generateMetadata({ params }: PageProps<'/subjects/[subject]'>): Promise<Metadata> {
  const data = await getSubject((await params).subject)
  return { title: data?.subject.name ?? 'Subject' }
}

export default async function SubjectPage({ params }: PageProps<'/subjects/[subject]'>) {
  const data = await getSubject((await params).subject)
  if (!data) notFound()
  const { subject, topics } = data

  return (
    <>
      <PageHeader eyebrow={<Link href="/subjects" className="hover:underline">Subjects</Link>} title={subject.name} description={subject.description} />
      {topics.length === 0 ? (
        <Panel>
          <EmptyState icon={<BookOpen />} title="No topics yet">
            Topics for {subject.name} appear here as soon as they are added.
          </EmptyState>
        </Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {topics.map((t) => (
            <Link key={t.slug} href={`/subjects/${subject.slug}/${t.slug}`} className="focus-ring group rounded-panel">
              <Panel className="flex h-full flex-col gap-3 transition-colors group-hover:border-primary/40">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold">{t.name}</h2>
                  <ChevronRight className="mt-1 size-4 text-muted-foreground" aria-hidden />
                </div>
                <p className="text-sm text-muted-foreground">{t.description}</p>
                <div className="mt-auto flex flex-col gap-2 pt-2">
                  <ProgressBar value={t.doneCount} max={t.lessonCount} label={`${t.name}: lessons done`} />
                  <p className="text-[13px] text-muted-foreground">
                    <Mono>
                      {t.doneCount}/{t.lessonCount}
                    </Mono>{' '}
                    lessons done · <Mono>{t.questionCount}</Mono> practice questions
                  </p>
                </div>
              </Panel>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
