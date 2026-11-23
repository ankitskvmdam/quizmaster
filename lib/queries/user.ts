import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type CurrentUser = { id: string; email: string; displayName: string }

/** The signed-in person, once per request. Redirects to /login when there is none. */
export const getUser = cache(async (): Promise<CurrentUser> => {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const id = data?.claims?.sub
  if (!id) redirect('/login')
  const email = String(data.claims.email ?? '')
  const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', id).maybeSingle()
  return { id, email, displayName: profile?.display_name || email.split('@')[0] || 'there' }
})
