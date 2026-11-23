import Link from 'next/link'
import { ChevronRight, Library } from 'lucide-react'
import { cn } from '@/lib/utils'

export type Crumb = { href: string; label: string }

/**
 * The trail from Courses down to the current page, as a plain line (no background) at the top of the page.
 * On phones the middle of a long trail folds into "…" so the parent and current page stay visible.
 */
export function Breadcrumbs({ items, current }: { items: Crumb[]; current: string }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="-mx-1 flex items-center gap-1 overflow-x-auto py-1 text-[13px] whitespace-nowrap">
        <li className="flex items-center">
          <Link href="/courses" className="focus-ring inline-flex items-center gap-1.5 rounded px-1 text-muted-foreground hover:text-foreground">
            <Library className="size-3.5" aria-hidden />
            Courses
          </Link>
        </li>
        {items.length > 1 && (
          // On phones the middle of a long trail folds into "…", keeping the parent and the current page visible.
          <li className="flex items-center gap-1 sm:hidden" aria-hidden>
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="px-1 text-muted-foreground">…</span>
          </li>
        )}
        {items.map((c, i) => (
          <li key={c.href} className={cn('flex items-center gap-1', i < items.length - 1 && 'max-sm:hidden')}>
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <Link href={c.href} className="focus-ring rounded px-1 text-muted-foreground hover:text-foreground">
              {c.label}
            </Link>
          </li>
        ))}
        <li className="flex items-center gap-1">
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span aria-current="page" className="px-1 font-medium text-foreground">
            {current}
          </span>
        </li>
      </ol>
    </nav>
  )
}
