import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/**
 * The dense, borderless table for lists inside a Panel: 14px cells, uppercase mono headers,
 * hairline row dividers. Give number cells `className="num"` for mono, right-aligned figures.
 * A row that opens something gets `data-clickable` and keeps a real link inside it.
 */
export function DataTable({ className, ...props }: ComponentProps<'table'>) {
  return (
    <div className="-mx-5 overflow-x-auto sm:-mx-6">
      <table
        className={cn(
          'w-full min-w-[36rem] border-collapse text-sm',
          '[&_th]:figures [&_th]:px-3 [&_th]:pb-2.5 [&_th]:text-left [&_th]:text-[11px] [&_th]:font-medium [&_th]:tracking-[0.08em] [&_th]:whitespace-nowrap [&_th]:text-muted-foreground [&_th]:uppercase',
          '[&_td]:border-t [&_td]:border-hairline [&_td]:px-3 [&_td]:py-3 [&_td]:align-middle',
          '[&_th:first-child]:pl-5 [&_td:first-child]:pl-5 sm:[&_th:first-child]:pl-6 sm:[&_td:first-child]:pl-6',
          '[&_th:last-child]:pr-5 [&_td:last-child]:pr-5 sm:[&_th:last-child]:pr-6 sm:[&_td:last-child]:pr-6',
          '[&_.num]:figures [&_.num]:text-right [&_.num]:whitespace-nowrap',
          '[&_tr[data-clickable]]:cursor-pointer [&_tr[data-clickable]:hover]:bg-soft',
          className,
        )}
        {...props}
      />
    </div>
  )
}
