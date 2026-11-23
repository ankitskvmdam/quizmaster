import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ListFilter } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { filterReview, type ReviewFilter, type ReviewPayload } from '@/lib/runner/types'
import { formatDateTime, formatDuration, formatPercent, formatScore } from '@/lib/format'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/surfaces'
import { StatTile } from '@/components/stat-tile'
import { EmptyState } from '@/components/empty-state'
import { ModeBadge } from '@/components/tests/attempt-list'
import { ReviewQuestion } from '@/components/review/review-question'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Review' }

const FILTERS: { value: ReviewFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'wrong', label: 'Wrong' },
  { value: 'skipped', label: 'Skipped' },
  { value: 'marked', label: 'Marked' },
]

export default async function ReviewPage({ params, searchParams }: PageProps<'/past/attempts/[id]'>) {
  const { id } = await params
  const sp = await searchParams
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_attempt_review', { p_attempt_id: id })
  if (error) {
    if (error.code === 'P0001') notFound()
    throw new Error('Could not load this review')
  }
  const { attempt, test, questions } = data as unknown as ReviewPayload
  const filter = (FILTERS.find((f) => f.value === sp.filter)?.value ?? 'all') as ReviewFilter
  const shown = filterReview(questions, filter)
  const answered = attempt.n_correct + attempt.n_wrong
  const maxScore = questions.length * Number(test.marks_correct)
  const taken = (Date.parse(attempt.submitted_at) - Date.parse(attempt.started_at)) / 1000

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-2">
            <Link href="/past" className="hover:underline">
              Past tests
            </Link>
            · {formatDateTime(attempt.submitted_at)}
          </span>
        }
        title={test.title}
        actions={<ModeBadge mode={attempt.mode} />}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="col-span-2 sm:col-span-3 lg:col-span-1">
          <StatTile large label="Score" value={formatScore(Number(attempt.score))} sub={`out of ${maxScore}`} />
        </div>
        <StatTile label="Correct" value={attempt.n_correct} tone="correct" />
        <StatTile label="Wrong" value={attempt.n_wrong} tone="wrong" />
        <StatTile label="Skipped" value={attempt.n_skipped} />
        <StatTile label="Accuracy" value={answered ? formatPercent(attempt.n_correct / answered) : '—'} />
        <StatTile label="Time taken" value={formatDuration(taken)} />
      </div>

      <nav aria-label="Filter questions" className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count = filterReview(questions, f.value).length
          const active = f.value === filter
          return (
            <Link
              key={f.value}
              href={f.value === 'all' ? `/past/attempts/${id}` : `/past/attempts/${id}?filter=${f.value}`}
              aria-current={active ? 'page' : undefined}
              scroll={false}
              className={cn(
                'focus-ring inline-flex h-8 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors',
                active ? 'border-transparent bg-primary text-primary-foreground' : 'border-hairline bg-panel hover:bg-soft',
              )}
            >
              {f.label}
              <span className="figures opacity-70">{count}</span>
            </Link>
          )
        })}
      </nav>

      {shown.length === 0 ? (
        <Panel>
          <EmptyState icon={<ListFilter />} title="Nothing here">
            No questions match this filter.
          </EmptyState>
        </Panel>
      ) : (
        <div className="flex flex-col gap-4">
          {shown.map((q) => (
            <ReviewQuestion key={q.id} q={q} number={questions.indexOf(q) + 1} />
          ))}
        </div>
      )}
    </>
  )
}
