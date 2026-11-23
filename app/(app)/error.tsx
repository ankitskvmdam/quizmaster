'use client'

import { Panel } from '@/components/surfaces'
import { SectionError } from '@/components/section-error'

export default function AppError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <Panel>
      <SectionError message="This page could not load. Check your connection and try again." onRetry={retry} />
    </Panel>
  )
}
