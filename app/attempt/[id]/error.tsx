'use client'

import Link from 'next/link'
import { GlowBackdrop } from '@/components/glow-backdrop'
import { Panel } from '@/components/surfaces'
import { SectionError } from '@/components/section-error'
import { Button } from '@/components/ui/button'

/** The runner's own error page. Answers already saved are safe; an expired test is submitted on the next load. */
export default function AttemptError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-4">
      <GlowBackdrop still />
      <Panel className="flex flex-col gap-4">
        <SectionError
          message="This test could not load. Your saved answers are safe. Check your connection and try again."
          onRetry={retry}
        />
        <Button variant="ghost" size="sm" asChild className="self-start">
          <Link href="/study">Back to Study</Link>
        </Button>
      </Panel>
    </main>
  )
}
