'use client'

import { useState, useTransition } from 'react'
import { LogOut } from 'lucide-react'
import { signOut } from '@/app/(auth)/actions'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/confirm-dialog'

export function initials(name: string) {
  const parts = name.trim().split(/[\s._-]+/).filter(Boolean)
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)
  return letters.toUpperCase()
}

/** The user's initials in the header: who is signed in, and sign out. */
export function AccountMenu({ displayName, email }: { displayName: string; email: string }) {
  const [confirming, setConfirming] = useState(false)
  const [pending, start] = useTransition()

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Account: ${displayName}`}
          className="focus-ring figures inline-flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-[var(--grad-1)] to-[var(--grad-2)] text-[13px] font-semibold text-primary-foreground"
        >
          {initials(displayName)}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="flex flex-col gap-0.5 font-normal">
            <span className="text-sm font-semibold">{displayName}</span>
            <span className="truncate text-[13px] text-muted-foreground">{email}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setConfirming(true)}>
            <LogOut aria-hidden />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        icon={<LogOut />}
        title="Sign out of QuizMaster?"
        description="Your progress is saved. You can sign back in any time with your email and password."
        confirmLabel="Sign out"
        pending={pending}
        onConfirm={() => start(() => signOut())}
      />
    </>
  )
}
