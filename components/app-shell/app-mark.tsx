import Link from 'next/link'
import { BRAND } from '@/lib/brand'
import { cn } from '@/lib/utils'

/** Gradient dot + the name in mono. The name hides on narrow phones when `compact`. */
export function AppMark({ href = '/study', compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="focus-ring inline-flex items-center gap-2.5 rounded-full py-1 pr-2">
      <span
        aria-hidden
        className="size-3 rounded-full bg-gradient-to-br from-[var(--grad-1)] via-[var(--grad-2)] to-[var(--grad-3)]"
      />
      <span className={cn('figures text-[15px] font-semibold tracking-tight', compact && 'max-[340px]:sr-only')}>
        {BRAND.name}
      </span>
    </Link>
  )
}
