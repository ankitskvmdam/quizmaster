import type { Metadata } from 'next'
import { ClipboardList } from 'lucide-react'
import { listTests } from '@/lib/queries/tests'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/surfaces'
import { EmptyState } from '@/components/empty-state'
import { TestList } from '@/components/tests/test-list'

export const metadata: Metadata = { title: 'Tests' }

export default async function TestsPage() {
  const tests = await listTests('mock')
  return (
    <>
      <PageHeader
        title="Tests"
        description="Mock tests. Take one against the clock, or practise it at your own pace with explanations as you go."
      />
      <Panel>
        <TestList
          tests={tests}
          empty={
            <EmptyState icon={<ClipboardList />} title="No mock tests yet">
              Mock tests appear here as soon as they are added.
            </EmptyState>
          }
        />
      </Panel>
    </>
  )
}
