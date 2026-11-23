import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

/** A small ring spinner that inherits the text colour. */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent', className)}
    />
  )
}

/** Centred spinner with a label, for a whole section that is loading. */
export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
      <Spinner />
      {label}
    </div>
  )
}

export { Skeleton }
