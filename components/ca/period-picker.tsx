'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { calendarPeriods, formatMonth, rollingPeriod, type MonthKey } from '@/lib/periods'
import { SegmentedControl } from '@/components/segmented-control'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type N = '3' | '6' | '12'

/** "Revise a period": last 3/6/12 months up to a chosen month, or a calendar block (quarter, half, year). */
export function PeriodPicker({ subjectSlug, months }: { subjectSlug: string; months: MonthKey[] }) {
  // months arrive newest first
  const [n, setN] = useState<N>('3')
  const [end, setEnd] = useState<MonthKey>(months[0])
  const base = `/courses/${subjectSlug}/current-affairs/period`
  const rolling = rollingPeriod(end, Number(n) as 3 | 6 | 12)
  const blocks = calendarPeriods(months)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Last</span>
          <SegmentedControl<N>
            label="Number of months"
            value={n}
            onChange={setN}
            options={[
              { value: '3', label: '3 months' },
              { value: '6', label: '6 months' },
              { value: '12', label: '12 months' },
            ]}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="period-end">Up to</Label>
          <select
            id="period-end"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="focus-ring h-10 rounded-lg border border-input bg-input-bg px-3 text-sm"
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {formatMonth(m)}
              </option>
            ))}
          </select>
        </div>
        <Button asChild>
          <Link href={`${base}?from=${rolling.from}&to=${rolling.to}`}>
            Revise {rolling.label.replace(/^Last/, 'last')}
            <ArrowRight />
          </Link>
        </Button>
      </div>
      {blocks.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Or a calendar block</span>
          <ul className="flex flex-wrap gap-2">
            {blocks.map((b) => (
              <li key={`${b.kind}-${b.from}`}>
                <Link
                  href={`${base}?from=${b.from}&to=${b.to}`}
                  className={cn(
                    'focus-ring inline-flex h-8 items-center rounded-full border px-3.5 text-[13px] font-medium transition-colors hover:bg-soft',
                    b.kind === 'year' ? 'border-primary/40 bg-tint text-tint-foreground' : 'border-hairline bg-panel',
                  )}
                >
                  {b.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
