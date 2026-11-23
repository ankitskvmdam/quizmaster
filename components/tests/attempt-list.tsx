'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import type { AttemptRow } from '@/lib/queries/tests'
import { formatDateTime, formatDuration, formatPercent, formatScore } from '@/lib/format'
import { Badge } from '@/components/badge'
import { DataTable } from '@/components/data-table'
import { Mono } from '@/components/surfaces'

export function ModeBadge({ mode }: { mode: 'timed' | 'practice' }) {
  return <Badge tone={mode === 'timed' ? 'primary' : 'neutral'}>{mode === 'timed' ? 'Timed' : 'Practice'}</Badge>
}

const href = (id: string) => `/past/attempts/${id}`

/** Attempts as a table (the whole row opens the review) from md up; stacked links on phones. */
export function AttemptList({ rows, compact = false }: { rows: AttemptRow[]; compact?: boolean }) {
  const router = useRouter()
  return (
    <>
      <div className="hidden md:block">
        <DataTable>
          <thead>
            <tr>
              <th>Test</th>
              <th>Mode</th>
              <th className="num">Score</th>
              <th className="num">Accuracy</th>
              {!compact && <th className="num">Time</th>}
              <th className="num">Date</th>
              <th>
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr
                key={a.id}
                data-clickable
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('a')) return
                  router.push(href(a.id))
                }}
              >
                <td className="font-medium">
                  <Link href={href(a.id)} className="focus-ring rounded hover:underline">
                    {a.testTitle}
                  </Link>
                </td>
                <td>
                  <ModeBadge mode={a.mode} />
                </td>
                <td className="num">
                  {a.score === null ? '—' : formatScore(a.score)}
                  <span className="text-muted-foreground">/{a.maxScore}</span>
                </td>
                <td className="num">{a.accuracy === null ? '—' : formatPercent(a.accuracy)}</td>
                {!compact && <td className="num">{a.durationSec === null ? '—' : formatDuration(a.durationSec)}</td>}
                <td className="num text-muted-foreground">{formatDateTime(a.submittedAt)}</td>
                <td className="w-6">
                  <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </div>
      <ul className="-my-2 flex flex-col md:hidden">
        {rows.map((a, i) => (
          <li key={a.id} className={i > 0 ? 'border-t border-hairline' : undefined}>
            <Link href={href(a.id)} className="focus-ring -mx-2 flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-soft">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{a.testTitle}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
                  <ModeBadge mode={a.mode} />
                  <Mono className="text-foreground">
                    {a.score === null ? '—' : formatScore(a.score)}/{a.maxScore}
                  </Mono>
                  {a.accuracy !== null && <Mono>{formatPercent(a.accuracy)}</Mono>}
                  <Mono>{formatDateTime(a.submittedAt)}</Mono>
                </p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
