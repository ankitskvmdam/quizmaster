'use client'

import { useState, useTransition } from 'react'
import { ListChecks, Timer } from 'lucide-react'
import { startCaPractice, startCaRevision } from '@/app/(app)/actions'
import { SegmentedControl } from '@/components/segmented-control'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ActionButton } from '@/components/action-button'
import { Button } from '@/components/ui/button'

type Count = '25' | '50'

/** Timed revision (25 or 50 questions, 1 min each, +1 / −0.33) or untimed practice over a period. */
export function PeriodRevision({ from, to, label, available }: { from: string; to: string; label: string; available: number }) {
  const [count, setCount] = useState<Count>('25')
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const n = Math.min(Number(count), available)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Questions</span>
          <SegmentedControl<Count>
            label="Number of questions"
            value={count}
            onChange={setCount}
            options={[
              { value: '25', label: '25' },
              { value: '50', label: '50' },
            ]}
          />
        </div>
        <Button onClick={() => setOpen(true)}>
          <Timer />
          Start timed revision
        </Button>
        <ActionButton variant="secondary" action={startCaPractice.bind(null, { from, to, count: 25 })}>
          <ListChecks />
          Practise the period
        </ActionButton>
      </div>
      {available < Number(count) && (
        <p className="text-[13px] text-review-fg">
          This period has {available} questions, so the test will have {available}.
        </p>
      )}
      <ConfirmDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o)
          if (!o) setError(null)
        }}
        icon={<Timer />}
        title={`Start a timed revision of ${label}?`}
        description={`${n} questions in ${n} min, +1 for each right answer and −0.33 for each wrong one. The clock starts now and keeps running if you leave.`}
        confirmLabel="Start the clock"
        pending={pending}
        error={error}
        onConfirm={() =>
          start(async () => {
            setError(null)
            const r = await startCaRevision({ from, to, count: Number(count) as 25 | 50 })
            if (r?.error) setError(r.error)
          })
        }
      />
    </div>
  )
}
