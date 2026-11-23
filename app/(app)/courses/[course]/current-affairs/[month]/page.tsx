import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FileCheck2, ListChecks } from 'lucide-react'
import { getMonth } from '@/lib/queries/current-affairs'
import { formatMonth, isMonthKey } from '@/lib/periods'
import { formatMarks, formatMinutes, formatScore } from '@/lib/format'
import { startCaPractice } from '@/app/(app)/actions'
import { PageHeader } from '@/components/page-header'
import { Panel, IconTile, Mono } from '@/components/surfaces'
import { CategoryRow } from '@/components/ca/category-row'
import { StartActions } from '@/components/tests/start-actions'
import { ActionButton } from '@/components/action-button'
import { EmptyState } from '@/components/empty-state'

type Props = PageProps<'/courses/[course]/current-affairs/[month]'>

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { month } = await params
  return { title: isMonthKey(month) ? `${formatMonth(month)} current affairs` : 'Current affairs' }
}

export default async function MonthPage({ params }: Props) {
  const { course: subject, month } = await params
  if (!isMonthKey(month)) notFound()
  const data = await getMonth(subject, month)
  if (!data) notFound()
  const base = `/courses/${subject}/current-affairs`
  const label = formatMonth(month)

  return (
    <>
      <PageHeader
        eyebrow={
          <>
            <Link href={`/courses/${subject}`} className="hover:underline">
              {data.section.subject.name}
            </Link>{' '}
            ·{' '}
            <Link href={base} className="hover:underline">
              {data.section.name}
            </Link>
          </>
        }
        title={label}
        description={
          <>
            <Mono>{data.noteCount}</Mono> notes in <Mono>{data.categories.length}</Mono> categories ·{' '}
            <Mono>{data.questionCount}</Mono> practice questions
          </>
        }
      />

      <div className="flex flex-col gap-6">
        {data.paper && (
          <Panel className="flex flex-col gap-4 border-transparent bg-tint sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <IconTile size="lg" className="bg-panel">
                <FileCheck2 />
              </IconTile>
              <div>
                <p className="font-semibold">{data.paper.title}</p>
                <p className="text-[13px] text-muted-foreground">
                  <Mono>{data.paper.questionCount}</Mono> questions ·{' '}
                  {data.paper.durationSec ? <Mono>{formatMinutes(data.paper.durationSec)}</Mono> : 'untimed'} ·{' '}
                  <Mono>
                    {formatMarks(data.paper.marksCorrect)} / {formatMarks(data.paper.marksWrong)}
                  </Mono>
                  {data.paper.bestScore !== null && (
                    <>
                      {' '}
                      · best <Mono>{formatScore(data.paper.bestScore)}</Mono>
                    </>
                  )}
                </p>
              </div>
            </div>
            <StartActions
              testId={data.paper.testId}
              title={data.paper.title}
              questionCount={data.paper.questionCount}
              durationSec={data.paper.durationSec}
              marksCorrect={data.paper.marksCorrect}
              marksWrong={data.paper.marksWrong}
            />
          </Panel>
        )}

        <Panel>
          <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Categories</h2>
            {data.questionCount > 0 && (
              <ActionButton
                variant="secondary"
                size="sm"
                action={startCaPractice.bind(null, { from: month, to: month, count: 25 })}
              >
                <ListChecks />
                Practise the whole month
              </ActionButton>
            )}
          </div>
          {data.categories.length === 0 ? (
            <EmptyState icon={<ListChecks />} title="Nothing here yet">
              Notes for {label} appear here as soon as they are added.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-hairline">
              {data.categories.map((c) => (
                <CategoryRow
                  key={c.slug}
                  name={c.name}
                  noteCount={c.noteCount}
                  questionCount={c.questionCount}
                  read={c.read}
                  readHref={`${base}/${month}/${c.slug}`}
                  practice={startCaPractice.bind(null, { from: month, to: month, categories: [c.slug], count: 10 })}
                />
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  )
}
