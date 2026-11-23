import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'

/**
 * Label above, control, then hint or error under it.
 * Give the control `id`, `aria-invalid` and `aria-describedby={describedBy(id, error, hint)}`.
 */
export function FormField({
  id,
  label,
  error,
  hint,
  action,
  children,
}: {
  id: string
  label: string
  error?: string | null
  hint?: ReactNode
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {action}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-[13px] text-wrong-fg">
          {error}
        </p>
      ) : hint ? (
        <div id={`${id}-hint`} className="text-[13px] text-muted-foreground">
          {hint}
        </div>
      ) : null}
    </div>
  )
}

export function describedBy(id: string, error?: string | null, hint?: unknown) {
  if (error) return `${id}-error`
  if (hint) return `${id}-hint`
  return undefined
}
