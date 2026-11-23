'use client'

import { useEffect, useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { IconButton } from '@/components/icon-button'
import { parsePreference, resolveTheme, THEME_STORAGE_KEY, type ThemePreference } from '@/lib/theme'

const order: ThemePreference[] = ['system', 'light', 'dark']
const labels: Record<ThemePreference, string> = {
  system: 'Theme: system. Switch to light',
  light: 'Theme: light. Switch to dark',
  dark: 'Theme: dark. Switch to system',
}

function apply(pref: ThemePreference) {
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  document.documentElement.setAttribute('data-theme', resolveTheme(pref, systemDark))
}

/** Cycles System → Light → Dark. System follows the OS setting live. */
export function ThemeSwitcher() {
  const [pref, setPref] = useState<ThemePreference>('system')

  useEffect(() => {
    let stored: string | null = null
    try {
      stored = localStorage.getItem(THEME_STORAGE_KEY)
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync from localStorage after mount
    setPref(parsePreference(stored))
  }, [])

  useEffect(() => {
    apply(pref)
    if (pref !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => apply('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [pref])

  function next() {
    const n = order[(order.indexOf(pref) + 1) % order.length]
    try {
      localStorage.setItem(THEME_STORAGE_KEY, n)
    } catch {}
    setPref(n)
  }

  const Icon = pref === 'system' ? Monitor : pref === 'light' ? Sun : Moon
  return (
    <IconButton aria-label={labels[pref]} title={labels[pref]} onClick={next}>
      <Icon />
    </IconButton>
  )
}
