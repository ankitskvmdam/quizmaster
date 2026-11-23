'use client'

import { useEffect, useState } from 'react'
import { greeting } from '@/lib/home'
import { formatDate } from '@/lib/format'
import { AccentText, Mono } from '@/components/surfaces'

/** Uses the viewer's clock, so it renders after mount; the server doesn't know their time zone. */
export function Greeting({ name }: { name: string }) {
  const [now, setNow] = useState<Date | null>(null)
  // eslint-disable-next-line react-hooks/set-state-in-effect -- the viewer's clock is only known after mount
  useEffect(() => setNow(new Date()), [])
  return (
    <header className="mb-8 flex flex-col items-center gap-2 pt-4 text-center">
      <Mono className="h-5 text-[13px] text-muted-foreground">{now ? formatDate(now) : ''}</Mono>
      <h1 className="text-[30px] leading-tight font-semibold tracking-tight">
        {now ? greeting(now.getHours()) : 'Welcome back'}, <AccentText>{name}</AccentText>
      </h1>
    </header>
  )
}
