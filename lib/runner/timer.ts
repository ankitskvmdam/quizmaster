export type TimerTone = 'normal' | 'review' | 'wrong'

/** Amber from five minutes, red from one minute. */
export function timerTone(secondsLeft: number): TimerTone {
  if (secondsLeft <= 60) return 'wrong'
  if (secondsLeft <= 300) return 'review'
  return 'normal'
}

/** What a screen reader hears: only when crossing 5:00 and 1:00, never every second. */
export function timerAnnouncement(prevSec: number, nowSec: number): string | null {
  if (prevSec > 300 && nowSec <= 300) return '5 minutes left'
  if (prevSec > 60 && nowSec <= 60) return '1 minute left'
  return null
}

/**
 * Seconds left on the server's clock. `serverNow` came with the page; `loadedAt` is the browser time
 * when it arrived. Elapsed browser time is added to the server's "now", so a wrong browser clock doesn't matter.
 */
export function remainingSeconds(deadlineIso: string, serverNowIso: string, loadedAt: number, browserNow: number): number {
  const serverNow = Date.parse(serverNowIso) + (browserNow - loadedAt)
  return Math.max(0, Math.round((Date.parse(deadlineIso) - serverNow) / 1000))
}

/**
 * True when the page's data was rendered well before it was shown (e.g. restored by the Back button):
 * the server's clock moved on further than the browser has been showing this page.
 */
export function isStalePayload(payloadServerNow: string, freshServerNow: string, browserElapsedMs: number, toleranceMs = 10_000) {
  const serverElapsed = Date.parse(freshServerNow) - Date.parse(payloadServerNow)
  return serverElapsed - browserElapsedMs > toleranceMs
}
