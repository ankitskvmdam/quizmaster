import Link from 'next/link'
import { SearchX } from 'lucide-react'
import { Panel } from '@/components/surfaces'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <Panel>
      <EmptyState
        icon={<SearchX />}
        title="We couldn't find that page"
        action={
          <Button asChild variant="secondary">
            <Link href="/courses">Browse courses</Link>
          </Button>
        }
      >
        It may have moved, or the link has a typo.
      </EmptyState>
    </Panel>
  )
}
