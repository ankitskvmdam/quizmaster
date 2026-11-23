'use client'

import { Clock, X } from 'lucide-react'
import { formatTimer } from '@/lib/format'
import { timerTone } from '@/lib/runner/timer'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Sticky bar: leave, title, the clock, and Submit. */
export function TopBar({
  title,
  mode,
  seconds,
  isLast,
  onLeave,
  onSubmit,
}: {
  title: string
  mode: 'timed' | 'practice'
  seconds: number | null
  isLast: boolean
  onLeave: () => void
  onSubmit: () => void
}) {
  const tone = mode === 'timed' && seconds !== null ? timerTone(seconds) : 'normal'
  const shown = seconds === null ? '--:--' : formatTimer(seconds)
  return (
    <div className="glass-surface sticky top-0 z-30 !rounded-none !border-x-0 !border-t-0 !shadow-none">
      <div className="mx-auto flex h-16 max-w-[72rem] items-center gap-3 px-4 sm:px-6">
        <Button variant="ghost" size="icon-sm" aria-label="Leave test" onClick={onLeave}>
          <X />
        </Button>
        <p className="min-w-0 flex-1 truncate text-[15px] font-semibold">{title}</p>
        <span
          className={cn(
            'figures inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[15px] font-semibold',
            mode === 'practice' && 'border-transparent text-muted-foreground',
            tone === 'normal' && mode === 'timed' && 'border-hairline bg-panel',
            tone === 'review' && 'border-review-border bg-review text-review-fg',
            tone === 'wrong' && 'border-wrong-border bg-wrong text-wrong-fg',
          )}
          aria-label={mode === 'timed' ? `Time left ${shown}` : `Time spent ${shown}`}
          role="timer"
        >
          <Clock className="size-4" aria-hidden />
          {shown}
        </span>
        <Button variant={isLast ? 'primary' : 'secondary'} size="sm" onClick={onSubmit}>
          Submit
        </Button>
      </div>
    </div>
  )
}
