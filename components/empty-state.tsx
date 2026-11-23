import type { ReactNode } from 'react'
import { IconTile } from '@/components/surfaces'

/** Says what will appear here and gives the one action that fills it. */
export function EmptyState({ icon, title, children, action }: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <IconTile size="lg">{icon}</IconTile>
      <p className="text-[15px] font-semibold">{title}</p>
      {children && <p className="max-w-sm text-sm text-muted-foreground">{children}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
