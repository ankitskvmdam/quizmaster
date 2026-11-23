'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { Check } from 'lucide-react'
import { markLessonDone } from '@/app/(app)/actions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/badge'

export function MarkDone({ lessonId, done }: { lessonId: string; done: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(done)
  const [, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function toggle(next: boolean) {
    start(async () => {
      setError(null)
      setOptimistic(next)
      const r = await markLessonDone(lessonId, next)
      if (r?.error) setError(r.error)
    })
  }

  return (
    <div className="flex flex-col items-start gap-2">
      {optimistic ? (
        <div className="flex items-center gap-3">
          <Badge tone="correct" dot>
            Done
          </Badge>
          <Button variant="ghost" size="sm" onClick={() => toggle(false)}>
            Mark as not done
          </Button>
        </div>
      ) : (
        <Button onClick={() => toggle(true)}>
          <Check />
          Mark as done
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
