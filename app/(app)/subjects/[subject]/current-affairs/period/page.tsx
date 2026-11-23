import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CalendarRange } from 'lucide-react'
import { getCaSection, getPeriod, listMonths } from '@/lib/queries/current-affairs'
import { parsePeriod } from '@/lib/periods'
import { startCaPractice } from '@/app/(app)/actions'
import { PageHeader } from '@/components/page-header'
import { Panel, Mono } from '@/components/surfaces'
import { EmptyState } from '@/components/empty-state'
import { CategoryRow } from '@/components/ca/category-row'
import { PeriodPicker } from '@/components/ca/period-picker'
import { PeriodRevision } from '@/components/ca/period-revision'

type Props = PageProps<'/subjects/[subject]/current-affairs/period'>

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams
  const p = parsePeriod(String(sp.from ?? ''), String(sp.to ?? ''))
  return { title: p ? `Revise ${p.label}` : 'Revise a period' }
}

export default async function PeriodPage({ params, searchParams }: Props) {
  const { subject } = await params
  const sp = await searchParams
  const section = await getCaSection(subject)
  if (!section) notFound()
  const period = parsePeriod(typeof sp.from === 'string' ? sp.from : undefined, typeof sp.to === 'string' ? sp.to : undefined)
  const base = `/subjects/${subject}/current-affairs`
  const eyebrow = (
    <>
      <Link href={`/subjects/${subject}`} className="hover:underline">
        {section.subject.name}
      </Link>{' '}
      ·{' '}
      <Link href={base} className="hover:underline">
        {section.name}
      </Link>
    </>
  )

  if (!period) {
    const months = await listMonths(subject)
    return (
      <>
        <PageHeader eyebrow={eyebrow} title="Revise a period" description="Choose a period of up to 12 months." />
        <Panel>
          {months.length ? (
            <PeriodPicker subjectSlug={subject} months={months.map((m) => m.month)} />
          ) : (
            <EmptyState icon={<CalendarRange />} title="No months yet">
              Periods become available as soon as months are added.
            </EmptyState>
          )}
        </Panel>
      </>
    )
  }

  const data = await getPeriod(subject, period)
  if (!data) notFound()
  const qs = `from=${period.from}&to=${period.to}`

  return (
    <>
      <PageHeader
        eyebrow={eyebrow}
        title={period.label}
        description={
          <>
            <Mono>{data.months.length}</Mono> {data.months.length === 1 ? 'month' : 'months'} ·{' '}
            <Mono>{data.noteCount}</Mono> notes · <Mono>{data.questionCount}</Mono> questions
          </>
        }
      />
      {data.months.length === 0 ? (
        <Panel>
          <EmptyState icon={<CalendarRange />} title="Nothing in this period yet">
            Choose another period, or come back when these months are added.
          </EmptyState>
        </Panel>
      ) : (
        <div className="flex flex-col gap-6">
          {data.questionCount > 0 && (
            <Panel className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold">Revision test</h2>
              <PeriodRevision from={period.from} to={period.to} label={period.label} available={data.questionCount} />
            </Panel>
          )}
          <Panel>
            <h2 className="mb-1 text-lg font-semibold">Categories</h2>
            <ul className="divide-y divide-hairline">
              {data.categories.map((c) => (
                <CategoryRow
                  key={c.slug}
                  name={c.name}
                  noteCount={c.noteCount}
                  questionCount={c.questionCount}
                  readHref={`${base}/period/${c.slug}?${qs}`}
                  practice={startCaPractice.bind(null, { from: period.from, to: period.to, categories: [c.slug], count: 10 })}
                />
              ))}
            </ul>
          </Panel>
        </div>
      )}
    </>
  )
}
