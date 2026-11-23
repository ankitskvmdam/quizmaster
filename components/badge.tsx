import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export type BadgeTone = 'neutral' | 'primary' | 'correct' | 'wrong' | 'review' | 'skipped'

const tones: Record<BadgeTone, string> = {
  neutral: 'border-hairline bg-soft text-muted-foreground',
  primary: 'border-transparent bg-tint text-tint-foreground',
  correct: 'border-correct-border bg-correct text-correct-fg',
  wrong: 'border-wrong-border bg-wrong text-wrong-fg',
  review: 'border-review-border bg-review text-review-fg',
  skipped: 'border-skipped-border bg-skipped text-skipped-fg',
}

/** A pill with an optional status dot. The label carries the meaning; colour only repeats it. */
export function Badge({
  tone = 'neutral',
  dot = false,
  className,
  children,
  ...props
}: ComponentProps<'span'> & { tone?: BadgeTone; dot?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap',
        tones[tone],
        className,
      )}
      {...props}
    >
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}
