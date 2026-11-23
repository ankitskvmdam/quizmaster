import { destinationFor } from '@/lib/confirm-params'

/**
 * Supabase sends people back to the Site URL root (or any page) when a redirect isn't allowed, so auth
 * parameters can land anywhere. Returns where to forward them (/auth/confirm with every param), or null.
 * A plain `?error=` is ours (e.g. /login?error=link); Supabase's errors always carry error_code.
 */
export function forwardToConfirm(pathname: string, sp: URLSearchParams): string | null {
  if (pathname === '/auth/confirm') return null
  const isAuth = sp.has('code') || sp.has('token_hash') || sp.has('error_code')
  if (!isAuth) return null
  return `/auth/confirm?${sp.toString()}`
}

export type HashAuth =
  | { kind: 'session'; accessToken: string; refreshToken: string; next: string }
  | { kind: 'error' }
  | null

/** Tokens or errors in the URL hash (implicit-flow links). Only the browser can read these. */
export function parseAuthHash(hash: string): HashAuth {
  const h = new URLSearchParams(hash.replace(/^#/, ''))
  const accessToken = h.get('access_token')
  const refreshToken = h.get('refresh_token')
  if (accessToken && refreshToken) {
    return { kind: 'session', accessToken, refreshToken, next: destinationFor(h.get('type'), h.get('next')) }
  }
  if (h.has('error_code') || h.has('error_description')) return { kind: 'error' }
  return null
}
