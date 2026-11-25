'use client'

import { useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteMyTest } from '@/app/(app)/actions'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'

/** Deletes a test the person built, after asking. Its attempts are deleted with it. */
export function DeleteTestButton({ testId, title }: { testId: string; title: string }) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)} aria-label={`Delete ${title}`}>
        <Trash2 />
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o)
          if (!o) setError(null)
        }}
        tone="destructive"
        icon={<Trash2 />}
        title="Delete this test?"
        description={
          <>
            <span className="font-medium text-foreground">{title}</span> will be deleted, together with your attempts on it
            and their scores. This can&apos;t be undone.
          </>
        }
        confirmLabel="Delete"
        pending={pending}
        error={error}
        onConfirm={() =>
          start(async () => {
            const result = await deleteMyTest(testId)
            if (result?.error) setError(result.error)
            else setOpen(false)
          })
        }
      />
    </>
  )
}
