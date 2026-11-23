const PROBE = 'http://same.invalid'

/**
 * Only same-site paths: "/tests?x=1" yes; "//evil.com", "https://…", "/\evil.com" and "/<tab>/evil.com" no.
 * Parses the value the way a browser would (which strips tabs and newlines) and keeps it only if it stays on our origin.
 */
export function safeNext(raw: unknown, fallback = '/study'): string {
  if (typeof raw !== 'string' || !raw.startsWith('/')) return fallback
  if (/[\u0000-\u001f\\]/.test(raw)) return fallback
  try {
    const url = new URL(raw, PROBE)
    if (url.origin !== PROBE) return fallback
    return url.pathname + url.search + url.hash
  } catch {
    return fallback
  }
}
