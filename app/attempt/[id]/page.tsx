import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { AttemptPayload } from '@/lib/runner/types'
import { Runner } from '@/components/runner/runner'

export const metadata: Metadata = { title: 'Test' }

export default async function AttemptPage({ params }: PageProps<'/attempt/[id]'>) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_attempt', { p_attempt_id: id })
  if (error) {
    if (error.code === 'P0001') notFound()
    throw new Error('Could not load this test')
  }
  const payload = data as unknown as AttemptPayload
  if (payload.attempt.submitted_at) redirect(`/past/attempts/${id}`)
  return <Runner initial={payload} />
}
