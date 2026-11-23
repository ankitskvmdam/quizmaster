import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/** The round header button. Always give it an aria-label. */
export function IconButton({ className, ...props }: ComponentProps<'button'> & { 'aria-label': string }) {
  return (
    <button
      type="button"
      className={cn(
        'focus-ring inline-flex size-10 items-center justify-center rounded-full border border-hairline bg-[color-mix(in_oklab,var(--panel-bg)_62%,transparent)] text-foreground transition-colors hover:bg-panel [&_svg]:size-[18px]',
        className,
      )}
      {...props}
    />
  )
}
