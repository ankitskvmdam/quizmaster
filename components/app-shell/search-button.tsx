'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { IconButton } from '@/components/icon-button'

/** Opens search. "/" anywhere (outside a text field) does the same. */
export function SearchButton() {
  const router = useRouter()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return
      e.preventDefault()
      router.push('/search')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [router])

  return (
    <IconButton aria-label="Search (press /)" onClick={() => router.push('/search')}>
      <Search aria-hidden />
    </IconButton>
  )
}
