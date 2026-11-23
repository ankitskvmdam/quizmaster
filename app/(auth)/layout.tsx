import { BRAND } from '@/lib/brand'
import { GlowBackdrop } from '@/components/glow-backdrop'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { AppMark } from '@/components/app-shell/app-mark'

export default function AuthLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="isolate flex min-h-dvh flex-col px-4">
      <GlowBackdrop />
      <div className="flex justify-end py-4">
        <ThemeSwitcher />
      </div>
      <main className="flex flex-1 flex-col items-center justify-center gap-6 pb-16">
        <div className="flex flex-col items-center gap-3 text-center">
          <AppMark href="/login" />
          <p className="max-w-[26rem] text-balance text-[15px] text-muted-foreground">{BRAND.tagline}</p>
        </div>
        {children}
      </main>
    </div>
  )
}
