'use client'

import { useId, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'

/** A radio group drawn as pills. Arrow keys move the choice. Renders a hidden input when given a name. */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  name,
}: {
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  name?: string
}) {
  const id = useId()
  function onKeyDown(e: KeyboardEvent) {
    const i = options.findIndex((o) => o.value === value)
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      onChange(options[(i + 1) % options.length].value)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      onChange(options[(i - 1 + options.length) % options.length].value)
    }
  }
  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="inline-flex w-fit gap-1 rounded-full border border-hairline bg-soft p-1"
    >
      {name && <input type="hidden" name={name} value={value} />}
      {options.map((o) => {
        const checked = o.value === value
        return (
          <button
            key={o.value}
            id={`${id}-${o.value}`}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cn(
              'focus-ring h-8 rounded-full px-3.5 text-[13px] font-medium transition-colors',
              checked ? 'bg-panel text-foreground shadow-panel' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
