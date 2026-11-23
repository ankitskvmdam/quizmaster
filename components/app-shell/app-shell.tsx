import type { ReactNode } from 'react'
import { GlowBackdrop } from '@/components/glow-backdrop'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { AppMark } from './app-mark'
import { AccountMenu } from './account-menu'
import { BottomDock } from './bottom-dock'
import type { ContentLang } from '@/lib/lang'

/** Header + centred content + the bottom dock. */
export function AppShell({ user, children }: { user: { displayName: string; email: string; contentLang: ContentLang }; children: ReactNode }) {
  return (
    <div className="isolate min-h-dvh">
      <GlowBackdrop />
      <header className="mx-auto flex max-w-[72rem] items-center justify-between px-4 py-4 sm:px-6">
        <AppMark compact />
        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          <AccountMenu displayName={user.displayName} email={user.email} contentLang={user.contentLang} />
        </div>
      </header>
      <main className="mx-auto max-w-[72rem] px-4 pt-2 pb-32 sm:px-6">{children}</main>
      <BottomDock />
    </div>
  )
}
