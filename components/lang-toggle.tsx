'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setContentLang } from '@/app/(app)/actions'
import { CONTENT_LANGS, type ContentLang } from '@/lib/lang'
import { cn } from '@/lib/utils'

/**
 * Switches the content language in place (हिन्दी / English) while reading or taking a test. It changes the same
 * saved preference as the account menu; text with no Hindi version stays English either way.
 */
export function LangToggle({ lang, className }: { lang: ContentLang; className?: string }) {
  const router = useRouter()
  const [shown, setShown] = useState(lang)
  const [pending, start] = useTransition()

  const choose = (value: ContentLang) => {
    if (value === shown || pending) return
    const previous = shown
    setShown(value)
    start(async () => {
      const r = await setContentLang(value)
      if (r?.error) setShown(previous)
      else router.refresh()
    })
  }

  return (
    <div role="group" aria-label="Content language" className={cn('inline-flex shrink-0 rounded-full border border-hairline bg-panel p-0.5 text-[13px]', className)}>
      {CONTENT_LANGS.map((l) => (
        <button
          key={l.value}
          type="button"
          aria-pressed={shown === l.value}
          disabled={pending}
          onClick={() => choose(l.value)}
          className={cn(
            'focus-ring rounded-full px-3 py-1 transition-colors disabled:opacity-60',
            shown === l.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}
