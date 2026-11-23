import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/** The standard container: white panel, hairline border, 24px radius. */
export function Panel({ className, ...props }: ComponentProps<'section'>) {
  return (
    <section
      className={cn('rounded-panel border border-hairline bg-panel p-5 shadow-panel sm:p-6', className)}
      {...props}
    />
  )
}

/** A nested block inside a panel. */
export function SoftPanel({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('rounded-[14px] bg-soft p-4', className)} {...props} />
}

/** A tinted square that holds an icon. */
export function IconTile({
  className,
  size = 'md',
  ...props
}: ComponentProps<'span'> & { size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-lg bg-tint text-tint-foreground',
        size === 'sm' && 'size-8 [&_svg]:size-4',
        size === 'md' && 'size-10 [&_svg]:size-5',
        size === 'lg' && 'size-12 [&_svg]:size-6',
        className,
      )}
      {...props}
    />
  )
}

/** Every figure — scores, timer, counts, dates — goes through Mono. */
export function Mono({ className, ...props }: ComponentProps<'span'>) {
  return <span className={cn('figures', className)} {...props} />
}

/** Small uppercase mono label above a title or a figure. */
export function Eyebrow({ className, ...props }: ComponentProps<'p'>) {
  return (
    <p
      className={cn('figures text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase', className)}
      {...props}
    />
  )
}

/** Text in the accent gradient. */
export function AccentText({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'bg-gradient-to-r from-[var(--grad-1)] to-[var(--grad-2)] bg-clip-text text-transparent',
        className,
      )}
      {...props}
    />
  )
}
