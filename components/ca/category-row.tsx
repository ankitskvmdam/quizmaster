import Link from 'next/link'
import { Check } from 'lucide-react'
import type { ActionResult } from '@/app/(app)/actions'
import { Mono } from '@/components/surfaces'
import { Badge } from '@/components/badge'
import { ActionButton } from '@/components/action-button'
import { Button } from '@/components/ui/button'

/** A category in a month or period: counts, an optional read tick, Read and Practice. */
export function CategoryRow({
  name,
  noteCount,
  questionCount,
  read,
  readHref,
  practice,
}: {
  name: string
  noteCount: number
  questionCount: number
  read?: boolean
  readHref: string
  practice: (() => Promise<ActionResult>) | null
}) {
  return (
    <li className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="flex items-center gap-2 font-medium">
          {name}
          {read && (
            <Badge tone="correct">
              <Check className="size-3" aria-hidden />
              Read
            </Badge>
          )}
        </p>
        <p className="text-[13px] text-muted-foreground">
          <Mono>{noteCount}</Mono> {noteCount === 1 ? 'note' : 'notes'} · <Mono>{questionCount}</Mono>{' '}
          {questionCount === 1 ? 'question' : 'questions'}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-start gap-2">
        {noteCount > 0 && (
          <Button variant="secondary" size="sm" asChild>
            <Link href={readHref}>Read</Link>
          </Button>
        )}
        {practice && questionCount > 0 && (
          <ActionButton size="sm" variant="ghost" action={practice}>
            Practice
          </ActionButton>
        )}
      </div>
    </li>
  )
}
