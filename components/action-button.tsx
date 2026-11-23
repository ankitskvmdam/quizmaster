'use client'

import { useState, useTransition, type ComponentProps, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/loading'
import type { ActionResult } from '@/app/(app)/actions'

/** A button that runs a server action, shows a spinner while it runs, and shows its error underneath. */
export function ActionButton({
  action,
  children,
  ...props
}: Omit<ComponentProps<typeof Button>, 'onClick' | 'children'> & {
  action: () => Promise<ActionResult>
  children: ReactNode
}) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        {...props}
        disabled={pending || props.disabled}
        aria-busy={pending || undefined}
        onClick={() =>
          start(async () => {
            setError(null)
            const r = await action()
            if (r?.error) setError(r.error)
          })
        }
      >
        {pending && <Spinner />}
        {children}
      </Button>
      {error && (
        <p role="alert" className="text-[13px] text-wrong-fg">
          {error}
        </p>
      )}
    </div>
  )
}
