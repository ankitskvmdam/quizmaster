'use client'

import { useRouter } from 'next/navigation'
import { SectionError } from '@/components/section-error'

/** SectionError whose retry re-renders the page's server components. */
export function SectionRetry({ message }: { message?: string }) {
  const router = useRouter()
  return <SectionError message={message} onRetry={() => router.refresh()} />
}
