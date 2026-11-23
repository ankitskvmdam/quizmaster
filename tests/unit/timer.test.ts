import { describe, expect, it } from 'vitest'
import { remainingSeconds, timerAnnouncement, timerTone } from '@/lib/runner/timer'

describe('timerTone', () => {
  it('is normal above five minutes, amber at five, red at one', () => {
    expect(timerTone(301)).toBe('normal')
    expect(timerTone(300)).toBe('review')
    expect(timerTone(61)).toBe('review')
    expect(timerTone(60)).toBe('wrong')
  })
})

describe('timerAnnouncement', () => {
  it('announces only when crossing five minutes and one minute', () => {
    expect(timerAnnouncement(301, 300)).toBe('5 minutes left')
    expect(timerAnnouncement(299, 298)).toBeNull()
    expect(timerAnnouncement(61, 59)).toBe('1 minute left')
    expect(timerAnnouncement(600, 590)).toBeNull()
  })
})

describe('remainingSeconds', () => {
  it('uses the server clock, not the browser clock', () => {
    // Browser clock is 2 minutes fast; server said "now" was 10:00:00 when the page loaded at browser 10:02:00.
    const deadline = '2026-11-23T10:10:00Z'
    const serverNow = '2026-11-23T10:00:00Z'
    const loadedAt = Date.parse('2026-11-23T10:02:00Z')
    const browserNow = loadedAt + 30_000
    expect(remainingSeconds(deadline, serverNow, loadedAt, browserNow)).toBe(570)
  })
  it('never goes below zero', () => {
    expect(remainingSeconds('2026-11-23T10:00:00Z', '2026-11-23T10:00:00Z', 0, 5_000)).toBe(0)
  })
})
