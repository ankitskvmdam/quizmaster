'use client'

import { useEffect, useRef } from 'react'
import { paletteCounts, paletteState, type PaletteInput, type PaletteState } from '@/lib/runner/palette'
import { Mono } from '@/components/surfaces'
import { cn } from '@/lib/utils'

const look: Record<PaletteState, string> = {
  unvisited: 'border-hairline bg-transparent text-muted-foreground',
  skipped: 'border-skipped-border bg-skipped text-skipped-fg',
  answered: 'border-transparent bg-primary text-primary-foreground',
  marked: 'border-review-border bg-review text-review-fg',
  'answered-marked': 'border-review-border bg-review text-review-fg',
  correct: 'border-correct-border bg-correct text-correct-fg',
  wrong: 'border-wrong-border bg-wrong text-wrong-fg',
}

const spoken: Record<PaletteState, string> = {
  unvisited: 'not visited',
  skipped: 'not answered',
  answered: 'answered',
  marked: 'marked for review',
  'answered-marked': 'answered, marked for review',
  correct: 'correct',
  wrong: 'wrong',
}

/**
 * Numbered round pills, one per question, plus a legend with counts. The grid scrolls inside itself, so a 150-question
 * paper never stretches the page: the parent sets the height (a sheet on phones, a sticky panel on desktop) and the
 * legend stays in view below the grid.
 */
export function Palette({
  items,
  current,
  onJump,
  className,
}: {
  items: PaletteInput[]
  current: number
  onJump: (i: number) => void
  className?: string
}) {
  const counts = paletteCounts(items)
  const listRef = useRef<HTMLOListElement>(null)

  // Keep the current question in view inside the grid (only the grid scrolls, never the page).
  useEffect(() => {
    const list = listRef.current
    const btn = list?.querySelector<HTMLElement>('[aria-current="step"]')
    if (!list || !btn) return
    const top = btn.offsetTop // the list is the button's offset parent (both are positioned)
    if (top < list.scrollTop || top + btn.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = top - (list.clientHeight - btn.offsetHeight) / 2
    }
  }, [current])

  return (
    <div className={cn('flex min-h-0 flex-col gap-4', className)}>
      <ol
        ref={listRef}
        aria-label="Questions"
        className="relative -m-1 grid min-h-0 grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] justify-items-center gap-x-1 gap-y-2 overflow-y-auto overscroll-contain p-1"
      >
        {items.map((q, i) => {
          const s = paletteState(q)
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => onJump(i)}
                aria-current={i === current ? 'step' : undefined}
                aria-label={`Question ${i + 1}, ${spoken[s]}`}
                className={cn(
                  'focus-ring figures relative flex size-10 items-center justify-center rounded-full border text-[13px] font-semibold transition-colors',
                  look[s],
                  i === current && 'ring-[3px] ring-ring',
                )}
              >
                {i + 1}
                {s === 'answered-marked' && (
                  <span aria-hidden className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2 border-panel bg-primary" />
                )}
              </button>
            </li>
          )
        })}
      </ol>
      <p className="shrink-0 text-[13px] text-muted-foreground">
        Answered <Mono className="text-foreground">{counts.answered}</Mono> · Marked{' '}
        <Mono className="text-foreground">{counts.marked}</Mono> · Not answered{' '}
        <Mono className="text-foreground">{counts.unanswered}</Mono>
      </p>
    </div>
  )
}
