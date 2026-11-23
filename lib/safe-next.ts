/** Only same-site paths: "/tests" yes, "//evil.com" and "https://…" no. */
export function safeNext(raw: unknown, fallback = '/study'): string {
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return fallback
  return raw
}
