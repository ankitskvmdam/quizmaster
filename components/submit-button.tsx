'use client'

import type { ComponentProps } from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/loading'

/** A form's main action. While pending it is disabled, aria-busy, and shows a spinner before its label. */
export function SubmitButton({
  children,
  pending: pendingProp,
  ...props
}: ComponentProps<typeof Button> & { pending?: boolean }) {
  const { pending: formPending } = useFormStatus()
  const pending = pendingProp ?? formPending
  return (
    <Button type="submit" disabled={pending || props.disabled} aria-busy={pending || undefined} {...props}>
      {pending && <Spinner />}
      {children}
    </Button>
  )
}
