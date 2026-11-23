'use client'

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

/** Numbered round pills, one per question, plus a legend with counts. */
export function Palette({
  items,
  current,
  onJump,
}: {
  items: PaletteInput[]
  current: number
  onJump: (i: number) => void
}) {
  const counts = paletteCounts(items)
  return (
    <div className="flex flex-col gap-4">
      <ol className="grid grid-cols-5 gap-2" aria-label="Questions">
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
      <p className="text-[13px] text-muted-foreground">
        Answered <Mono className="text-foreground">{counts.answered}</Mono> · Marked{' '}
        <Mono className="text-foreground">{counts.marked}</Mono> · Not answered{' '}
        <Mono className="text-foreground">{counts.unanswered}</Mono>
      </p>
    </div>
  )
}
