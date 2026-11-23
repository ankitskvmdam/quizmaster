'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { parseAuthHash } from '@/lib/auth-links'

/**
 * Some email links return tokens in the URL hash (#access_token=…), which the server never sees.
 * Turn them into a cookie session and go where the link meant; turn a hash error into the friendly note.
 */
export function AuthHashHandler() {
  useEffect(() => {
    const auth = parseAuthHash(window.location.hash)
    if (!auth) return
    history.replaceState(null, '', window.location.pathname + window.location.search) // drop tokens from the URL
    if (auth.kind === 'error') {
      window.location.replace('/login?notice=confirmed')
      return
    }
    createClient()
      .auth.setSession({ access_token: auth.accessToken, refresh_token: auth.refreshToken })
      .then(({ error }) => window.location.replace(error ? '/login?notice=confirmed' : auth.next))
  }, [])
  return null
}
