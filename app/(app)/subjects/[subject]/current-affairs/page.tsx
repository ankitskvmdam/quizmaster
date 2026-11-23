import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CalendarDays } from 'lucide-react'
import { getCaSection, listMonths } from '@/lib/queries/current-affairs'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/surfaces'
import { EmptyState } from '@/components/empty-state'
import { MonthCard } from '@/components/ca/month-card'
import { PeriodPicker } from '@/components/ca/period-picker'

export const metadata: Metadata = { title: 'Current Affairs' }

export default async function CurrentAffairsPage({ params }: PageProps<'/subjects/[subject]/current-affairs'>) {
  const { subject } = await params
  const section = await getCaSection(subject)
  if (!section) notFound()
  const months = await listMonths(subject)

  const years = new Map<string, typeof months>()
  for (const m of months) years.set(m.month.slice(0, 4), [...(years.get(m.month.slice(0, 4)) ?? []), m])

  return (
    <>
      <PageHeader
        eyebrow={
          <Link href={`/subjects/${subject}`} className="hover:underline">
            {section.subject.name}
          </Link>
        }
        title={section.name}
        description="Short notes by category, then quick practice. Revise a month, or several at once."
      />
      {months.length === 0 ? (
        <Panel>
          <EmptyState icon={<CalendarDays />} title="No months yet">
            New months appear here as soon as they&apos;re added.
          </EmptyState>
        </Panel>
      ) : (
        <div className="flex flex-col gap-8">
          <section aria-labelledby="revise">
            <Panel className="flex flex-col gap-4">
              <h2 id="revise" className="text-lg font-semibold">
                Revise a period
              </h2>
              <PeriodPicker subjectSlug={subject} months={months.map((m) => m.month)} />
            </Panel>
          </section>
          {[...years.entries()].map(([year, ms]) => (
            <section key={year} aria-labelledby={`year-${year}`}>
              <h2 id={`year-${year}`} className="figures mb-3 text-lg font-semibold">
                {year}
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {ms.map((m) => (
                  <MonthCard key={m.month} subjectSlug={subject} m={m} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  )
}
