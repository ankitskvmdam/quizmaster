import type { ReactNode } from 'react'
import { Eyebrow } from '@/components/surfaces'
import { cn } from '@/lib/utils'

/** A label over a big mono figure. */
export function StatTile({
  label,
  value,
  sub,
  large = false,
  tone,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  large?: boolean
  tone?: 'correct' | 'wrong' | 'review'
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[14px] bg-soft px-4 py-3.5">
      <Eyebrow>{label}</Eyebrow>
      <span
        className={cn(
          'figures font-semibold tracking-tight',
          large ? 'text-[32px] leading-none' : 'text-[22px] leading-none',
          tone === 'correct' && 'text-correct-fg',
          tone === 'wrong' && 'text-wrong-fg',
          tone === 'review' && 'text-review-fg',
        )}
      >
        {value}
      </span>
      {sub && <span className="text-[13px] text-muted-foreground">{sub}</span>}
    </div>
  )
}
