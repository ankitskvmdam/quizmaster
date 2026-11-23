'use client'

import { useState, useTransition } from 'react'
import { Timer } from 'lucide-react'
import { startTest } from '@/app/(app)/actions'
import { formatMarks, formatMinutes } from '@/lib/format'
import { ActionButton } from '@/components/action-button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'

/** "Start timed" (asks first, so nobody starts a clock by accident) and "Practice". */
export function StartActions({
  testId,
  title,
  questionCount,
  durationSec,
  marksCorrect,
  marksWrong,
}: {
  testId: string
  title: string
  questionCount: number
  durationSec: number | null
  marksCorrect: number
  marksWrong: number
}) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const marking =
    marksWrong < 0
      ? `${formatMarks(marksCorrect)} for each right answer and ${formatMarks(marksWrong)} for each wrong one`
      : `${formatMarks(marksCorrect)} for each right answer, no negative marking`

  return (
    <div className="flex flex-wrap items-start justify-end gap-2">
      {durationSec && (
        <Button size="sm" onClick={() => setOpen(true)}>
          Start timed
        </Button>
      )}
      <ActionButton size="sm" variant="secondary" action={startTest.bind(null, testId, 'practice')}>
        Practice
      </ActionButton>
      {durationSec && (
        <ConfirmDialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o)
            if (!o) setError(null)
          }}
          icon={<Timer />}
          title={`Start ${title}?`}
          description={`${questionCount} questions in ${formatMinutes(durationSec)}, ${marking}. The clock starts now and keeps running if you leave.`}
          confirmLabel="Start the clock"
          pending={pending}
          error={error}
          onConfirm={() =>
            start(async () => {
              setError(null)
              const r = await startTest(testId, 'timed')
              if (r?.error) setError(r.error)
            })
          }
        />
      )}
    </div>
  )
}
