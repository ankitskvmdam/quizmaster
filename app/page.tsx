import { BookOpen } from 'lucide-react'
import { BRAND } from '@/lib/brand'
import { GlowBackdrop } from '@/components/glow-backdrop'
import { Panel, IconTile, Eyebrow, Mono } from '@/components/surfaces'
import { Badge } from '@/components/badge'
import { Button } from '@/components/ui/button'
import { ThemeSwitcher } from '@/components/theme-switcher'

// Temporary landing until the app shell lands (Task 7 redirects / → /study).
export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-6 px-4">
      <GlowBackdrop />
      <div className="flex justify-end">
        <ThemeSwitcher />
      </div>
      <Panel className="flex flex-col gap-4">
        <IconTile>
          <BookOpen />
        </IconTile>
        <Eyebrow>{BRAND.name}</Eyebrow>
        <h1 className="text-[28px] font-semibold">{BRAND.tagline}</h1>
        <div className="flex flex-wrap gap-2">
          <Badge tone="correct" dot>Correct</Badge>
          <Badge tone="wrong" dot>Wrong</Badge>
          <Badge tone="review" dot>Marked</Badge>
          <Badge tone="skipped">Skipped</Badge>
          <Mono className="text-sm">42:07</Mono>
        </div>
        <div className="flex gap-2">
          <Button>Start test</Button>
          <Button variant="secondary">Practice</Button>
        </div>
      </Panel>
    </main>
  )
}
