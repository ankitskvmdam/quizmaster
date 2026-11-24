'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ClipboardList, History, House, Library, Sparkles, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export const DOCK_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/study', label: 'Study', icon: House },
  { href: '/courses', label: 'Courses', icon: Library },
  { href: '/tests', label: 'Tests', icon: ClipboardList },
  { href: '/past', label: 'Attempts', icon: History },
  { href: '/new', label: 'New', icon: Sparkles },
]

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** The primary navigation: a floating glass dock at the bottom centre, the same on every screen size. */
export function BottomDock() {
  const pathname = usePathname()
  return (
    <nav
      aria-label="Main"
      className="glass-surface fixed bottom-[max(12px,env(safe-area-inset-bottom))] left-1/2 z-40 -translate-x-1/2 rounded-dock p-1.5"
    >
      <ul className="flex items-center gap-1">
        {DOCK_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href)
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'focus-ring flex w-[62px] flex-col items-center gap-1 rounded-2xl px-1 pt-2 pb-1.5 text-[11px] font-medium transition-colors sm:w-[72px]',
                  active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-soft hover:text-foreground',
                )}
              >
                <Icon className="size-5" aria-hidden />
                <span className="leading-none whitespace-nowrap">{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
