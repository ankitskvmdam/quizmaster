'use client'

import type { ReactNode } from 'react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/loading'
import { cn } from '@/lib/utils'

type Tone = 'neutral' | 'warning' | 'destructive'

const tileTone: Record<Tone, string> = {
  neutral: 'bg-tint text-tint-foreground',
  warning: 'bg-review text-review-fg',
  destructive: 'bg-wrong text-wrong-fg',
}

/**
 * The standard confirmation: icon tile, a title that names the thing as a question,
 * one plain sentence, then Cancel and a confirm button that says what it does.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  tone = 'neutral',
  icon,
  title,
  description,
  cancelLabel = 'Cancel',
  confirmLabel,
  pending = false,
  error,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tone?: Tone
  icon: ReactNode
  title: string
  description: ReactNode
  cancelLabel?: string
  confirmLabel: string
  pending?: boolean
  error?: string | null
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <AlertDialogContent
        onEscapeKeyDown={(e) => pending && e.preventDefault()}
        className="flex flex-col gap-4"
      >
        <span
          aria-hidden
          className={cn('inline-flex size-12 items-center justify-center rounded-[14px] [&_svg]:size-6', tileTone[tone])}
        >
          {icon}
        </span>
        <div className="flex flex-col gap-2">
          <AlertDialogTitle className="text-lg font-semibold">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-[15px] text-muted-foreground">{description}</AlertDialogDescription>
        </div>
        {error && (
          <p role="alert" className="text-sm text-wrong-fg">
            {error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" disabled={pending} onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'destructive' ? 'destructive' : 'primary'}
            disabled={pending}
            aria-busy={pending || undefined}
            onClick={onConfirm}
          >
            {pending && <Spinner />}
            {confirmLabel}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
