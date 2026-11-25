'use client'

import { useState, useTransition } from 'react'
import { Languages, LogOut } from 'lucide-react'
import { setContentLang } from '@/app/(app)/actions'
import { CONTENT_LANGS, type ContentLang } from '@/lib/lang'
import { signOut } from '@/app/(auth)/actions'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/confirm-dialog'

export function initials(name: string) {
  const parts = name.trim().split(/[\s._-]+/).filter(Boolean)
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)
  return letters.toUpperCase()
}

/** The user's initials in the header: who is signed in, the content language, and sign out. */
export function AccountMenu({ displayName, email, contentLang }: { displayName: string; email: string; contentLang: ContentLang }) {
  const [confirming, setConfirming] = useState(false)
  const [pending, start] = useTransition()
  const [lang, setLang] = useState(contentLang)
  const [switching, startSwitch] = useTransition()
  const [langError, setLangError] = useState<string | null>(null)

  const chooseLang = (value: string) => {
    const previous = lang
    setLang(value as ContentLang)
    setLangError(null)
    startSwitch(async () => {
      const r = await setContentLang(value)
      if (r?.error) {
        setLang(previous)
        setLangError(r.error)
      }
    })
  }

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
          <DropdownMenuLabel className="flex items-center gap-2 text-[13px] font-normal text-muted-foreground">
            <Languages className="size-4" aria-hidden />
            Content language
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup value={lang} onValueChange={chooseLang}>
            {CONTENT_LANGS.map((l) => (
              <DropdownMenuRadioItem key={l.value} value={l.value} disabled={switching} onSelect={(e) => e.preventDefault()}>
                <span lang={l.value}>{l.label}</span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          {langError && (
            <p role="alert" className="px-2 py-1 text-[13px] text-wrong-fg">
              {langError}
            </p>
          )}
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
