'use client'

import { CircleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** A message and a retry inside a panel whose data failed to load. */
export function SectionError({ message = 'This section could not load.', onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 py-2">
      <p className="flex items-center gap-2 text-sm text-wrong-fg">
        <CircleAlert className="size-4" aria-hidden />
        {message}
      </p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
