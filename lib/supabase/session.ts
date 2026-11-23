import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from './database.types'
import { supabaseEnv } from './env'

const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password']
const GUEST_ONLY = ['/login', '/signup', '/forgot-password']

export function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p) || pathname.startsWith('/auth/')
}

/** Refreshes the session cookie and keeps signed-out people on the auth pages. */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request })
  const { url, key } = supabaseEnv()

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v))
      },
    },
  })

  // Do not run code between createServerClient and getClaims: it refreshes the token.
  const { data } = await supabase.auth.getClaims()
  const signedIn = Boolean(data?.claims?.sub)
  const { pathname, search } = request.nextUrl

  if (!signedIn && !isPublicPath(pathname)) {
    const to = request.nextUrl.clone()
    to.pathname = '/login'
    to.search = pathname === '/' ? '' : `?next=${encodeURIComponent(pathname + search)}`
    return withCookies(NextResponse.redirect(to), response)
  }

  if (signedIn && GUEST_ONLY.includes(pathname)) {
    const to = request.nextUrl.clone()
    to.pathname = '/study'
    to.search = ''
    return withCookies(NextResponse.redirect(to), response)
  }

  return response
}

function withCookies(target: NextResponse, source: NextResponse) {
  source.cookies.getAll().forEach((c) => target.cookies.set(c))
  return target
}
