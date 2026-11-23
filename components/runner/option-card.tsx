'use client'

import { Check, X } from 'lucide-react'
import type { Option } from '@/lib/runner/types'
import { Markdown } from '@/components/markdown'
import { cn } from '@/lib/utils'

export type OptionLook = 'idle' | 'selected' | 'correct' | 'wrong' | 'dimmed'

/** One answer as a full-width card: a mono letter tile, then the option text. The whole card is the target. */
export function OptionCard({
  option,
  look,
  checked,
  label,
  disabled,
  tabIndex,
  onSelect,
}: {
  option: Option
  look: OptionLook
  checked: boolean
  label?: string
  disabled?: boolean
  tabIndex: number
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      aria-disabled={disabled || undefined}
      tabIndex={tabIndex}
      data-option={option.key}
      onClick={() => !disabled && onSelect()}
      className={cn(
        'focus-ring flex min-h-14 w-full items-center gap-3.5 rounded-lg border px-3.5 py-3 text-left transition-colors',
        look === 'idle' && 'border-hairline bg-panel hover:border-primary/50 hover:bg-soft',
        look === 'selected' && 'border-primary bg-tint',
        look === 'correct' && 'border-correct-border bg-correct',
        look === 'wrong' && 'border-wrong-border bg-wrong',
        look === 'dimmed' && 'border-hairline bg-panel opacity-60',
        disabled && 'cursor-default',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'figures inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-[13px] font-semibold',
          look === 'selected' ? 'bg-primary text-primary-foreground' : 'bg-soft text-muted-foreground',
          look === 'correct' && 'bg-correct-fg text-panel',
          look === 'wrong' && 'bg-wrong-fg text-panel',
        )}
      >
        {look === 'correct' ? <Check className="size-4" /> : look === 'wrong' ? <X className="size-4" /> : option.key}
      </span>
      <span className="flex-1">
        <span className="sr-only">Option {option.key}: </span>
        <Markdown variant="option" source={option.text_md} />
      </span>
      {label && (
        <span
          className={cn(
            'shrink-0 text-[12px] font-medium',
            look === 'correct' && 'text-correct-fg',
            look === 'wrong' && 'text-wrong-fg',
          )}
        >
          {label}
        </span>
      )}
    </button>
  )
}
