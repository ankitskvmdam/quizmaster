import Link from 'next/link'
import { CalendarDays, ChevronRight, FileCheck2 } from 'lucide-react'
import type { MonthSummary } from '@/lib/queries/current-affairs'
import { formatMonth } from '@/lib/periods'
import { Panel, IconTile, Mono } from '@/components/surfaces'
import { ProgressBar } from '@/components/progress-bar'
import { Badge } from '@/components/badge'

/** One month of current affairs: counts, categories read, and whether it has a test paper. */
export function MonthCard({ subjectSlug, m }: { subjectSlug: string; m: MonthSummary }) {
  const label = formatMonth(m.month)
  return (
    <Link href={`/subjects/${subjectSlug}/current-affairs/${m.month}`} className="focus-ring group rounded-panel">
      <Panel className="flex h-full flex-col gap-3 transition-colors group-hover:border-primary/40">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <IconTile size="sm">
              <CalendarDays />
            </IconTile>
            <h3 className="text-lg font-semibold">{label}</h3>
          </div>
          <ChevronRight className="mt-1.5 size-4 text-muted-foreground" aria-hidden />
        </div>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
          <span>
            <Mono className="text-foreground">{m.noteCount}</Mono> notes
          </span>
          <span aria-hidden>·</span>
          <span>
            <Mono className="text-foreground">{m.questionCount}</Mono> questions
          </span>
          {m.hasPaper && (
            <Badge tone="primary">
              <FileCheck2 className="size-3" aria-hidden />
              Test paper
            </Badge>
          )}
        </p>
        <div className="mt-auto flex flex-col gap-1.5 pt-1">
          <ProgressBar value={m.categoriesRead} max={m.categoriesWithNotes} label={`${label}: categories read`} />
          <p className="text-[13px] text-muted-foreground">
            <Mono>
              {m.categoriesRead}/{m.categoriesWithNotes}
            </Mono>{' '}
            categories read
          </p>
        </div>
      </Panel>
    </Link>
  )
}
