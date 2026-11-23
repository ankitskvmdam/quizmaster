'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { Check } from 'lucide-react'
import { markChapterRead } from '@/app/(app)/actions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/badge'

export function MarkChapterRead({ chapterId, read }: { chapterId: string; read: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(read)
  const [, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function toggle(next: boolean) {
    start(async () => {
      setError(null)
      setOptimistic(next)
      const r = await markChapterRead(chapterId, next)
      if (r?.error) setError(r.error)
    })
  }

  return (
    <div className="flex flex-col items-start gap-2">
      {optimistic ? (
        <div className="flex items-center gap-3">
          <Badge tone="correct" dot>
            Read
          </Badge>
          <Button variant="ghost" size="sm" onClick={() => toggle(false)}>
            Mark as unread
          </Button>
        </div>
      ) : (
        <Button variant="secondary" onClick={() => toggle(true)}>
          <Check />
          Mark as read
        </Button>
      )}
      {error && (
        <p role="alert" className="text-[13px] text-wrong-fg">
          {error}
        </p>
      )}
    </div>
  )
}
