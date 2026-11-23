import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, BookOpen, CalendarDays, ChevronRight } from 'lucide-react'
import { getSubject, type SectionInfo, type TopicCard } from '@/lib/queries/content'
import { listMonths } from '@/lib/queries/current-affairs'
import { PageHeader } from '@/components/page-header'
import { Panel, Mono } from '@/components/surfaces'
import { ProgressBar } from '@/components/progress-bar'
import { EmptyState } from '@/components/empty-state'
import { MonthCard } from '@/components/ca/month-card'
import { Button } from '@/components/ui/button'

export async function generateMetadata({ params }: PageProps<'/subjects/[subject]'>): Promise<Metadata> {
  const data = await getSubject((await params).subject)
  return { title: data?.subject.name ?? 'Subject' }
}

function TopicGrid({ subjectSlug, subjectName, topics }: { subjectSlug: string; subjectName: string; topics: TopicCard[] }) {
  if (topics.length === 0) {
    return (
      <Panel>
        <EmptyState icon={<BookOpen />} title="No topics yet">
          Topics for {subjectName} appear here as soon as they are added.
        </EmptyState>
      </Panel>
    )
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {topics.map((t) => (
        <Link key={t.slug} href={`/subjects/${subjectSlug}/${t.slug}`} className="focus-ring group rounded-panel">
          <Panel className="flex h-full flex-col gap-3 transition-colors group-hover:border-primary/40">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-semibold">{t.name}</h3>
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
  )
}

async function CurrentAffairsPreview({ subjectSlug }: { subjectSlug: string }) {
  const months = (await listMonths(subjectSlug)).slice(0, 3)
  if (months.length === 0) {
    return (
      <Panel>
        <EmptyState icon={<CalendarDays />} title="No months yet">
          Monthly current affairs appear here as soon as they are added.
        </EmptyState>
      </Panel>
    )
  }
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {months.map((m) => (
        <MonthCard key={m.month} subjectSlug={subjectSlug} m={m} />
      ))}
    </div>
  )
}

function SectionHeading({ section, action }: { section: SectionInfo; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
      <h2 id={`section-${section.slug}`} className="text-xl font-semibold tracking-tight">
        {section.name}
      </h2>
      {action}
    </div>
  )
}

export default async function SubjectPage({ params }: PageProps<'/subjects/[subject]'>) {
  const data = await getSubject((await params).subject)
  if (!data) notFound()
  const { subject, topics, sections } = data
  const header = (
    <PageHeader eyebrow={<Link href="/subjects" className="hover:underline">Subjects</Link>} title={subject.name} description={subject.description} />
  )

  if (sections.length === 0) {
    return (
      <>
        {header}
        <TopicGrid subjectSlug={subject.slug} subjectName={subject.name} topics={topics} />
      </>
    )
  }

  const topicSections = sections.filter((s) => s.kind === 'topics')
  const topicsOf = (s: SectionInfo) =>
    topics.filter((t) => t.sectionId === s.id || (topicSections.length === 1 && t.sectionId === null))

  return (
    <>
      {header}
      <div className="flex flex-col gap-10">
        {sections.map((s) => (
          <section key={s.id} aria-labelledby={`section-${s.slug}`}>
            {s.kind === 'current_affairs' ? (
              <>
                <SectionHeading
                  section={s}
                  action={
                    <Button variant="secondary" size="sm" asChild>
                      <Link href={`/subjects/${subject.slug}/current-affairs`}>
                        All months & revision
                        <ArrowRight />
                      </Link>
                    </Button>
                  }
                />
                <CurrentAffairsPreview subjectSlug={subject.slug} />
              </>
            ) : (
              <>
                <SectionHeading section={s} />
                <TopicGrid subjectSlug={subject.slug} subjectName={subject.name} topics={topicsOf(s)} />
              </>
            )}
          </section>
        ))}
      </div>
    </>
  )
}
