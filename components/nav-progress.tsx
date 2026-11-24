'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/** Give up on a navigation that never lands (e.g. it was cancelled), so the bar can't stay forever. */
const GIVE_UP_MS = 15_000
const FADE_MS = 300

/**
 * A thin bar at the top of the screen while a link's page is loading, and a dimmed look on the link that was pressed
 * (`data-nav-pending`), so a tap always visibly registers. It starts on any same-site link click and ends when the
 * address changes. The states are styled in globals.css. Render it inside <Suspense> (it reads the search params).
 */
export function NavProgress() {
  const pathname = usePathname()
  const search = useSearchParams().toString()
  const bar = useRef<HTMLDivElement>(null)
  const pressed = useRef<HTMLAnchorElement | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Everything here is plain DOM state (an attribute on the bar and on the pressed link), so no re-render is needed.
  const api = useRef({
    set(state: 'idle' | 'loading' | 'done') {
      if (timer.current) clearTimeout(timer.current)
      timer.current = null
      if (state !== 'loading') {
        pressed.current?.removeAttribute('data-nav-pending')
        pressed.current = null
      }
      if (bar.current) bar.current.dataset.state = state
      if (state !== 'idle') timer.current = setTimeout(() => api.current.set('idle'), state === 'done' ? FADE_MS : GIVE_UP_MS)
    },
  })

  // The address changed: the new page is here.
  useEffect(() => {
    if (bar.current?.dataset.state === 'loading') api.current.set('done')
  }, [pathname, search])

  useEffect(() => {
    const { set } = api.current
    function onClick(e: MouseEvent) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element | null)?.closest?.('a')
      if (!a || !a.href || (a.target && a.target !== '_self') || a.hasAttribute('download')) return
      const url = new URL(a.href)
      if (url.origin !== location.origin) return
      // Same page (or only the #hash differs): nothing will load.
      if (url.pathname === location.pathname && url.search === location.search) return
      set('idle')
      a.setAttribute('data-nav-pending', '')
      pressed.current = a
      set('loading')
    }
    // Capture phase: next/link cancels the click's default action before it would bubble up to here.
    document.addEventListener('click', onClick, true)
    return () => {
      document.removeEventListener('click', onClick, true)
      set('idle')
    }
  }, [])

  return <div ref={bar} aria-hidden data-state="idle" className="nav-progress pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px] origin-left bg-primary" />
}
