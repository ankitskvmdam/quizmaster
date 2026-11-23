export const OFFLINE_MESSAGE = "Couldn't reach the server. Check your connection; we'll keep trying."

/** Server actions reject when the network is down. Turn that into a normal failure result, but let redirects through. */
export async function callSafely<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (e) {
    const digest = (e as { digest?: unknown } | null)?.digest
    if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) throw e
    return fallback
  }
}
