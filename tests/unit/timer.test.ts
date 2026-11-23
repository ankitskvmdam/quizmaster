import { describe, expect, it } from 'vitest'
import { isStalePayload, remainingSeconds, timerAnnouncement, timerTone } from '@/lib/runner/timer'

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

describe('isStalePayload', () => {
  const rendered = '2026-11-23T10:00:00Z'
  it('is fresh when the server has moved on about as much as the browser has', () => {
    // mounted 2s after render, browser has been up 1s since mount
    expect(isStalePayload(rendered, '2026-11-23T10:00:03Z', 1_000)).toBe(false)
  })
  it('is stale when the page came from a cache long after it was rendered (Back button)', () => {
    expect(isStalePayload(rendered, '2026-11-23T10:05:00Z', 1_000)).toBe(true)
  })
  it('ignores a wrong browser clock, since it only compares elapsed times', () => {
    expect(isStalePayload(rendered, '2026-11-23T10:00:08Z', 6_000)).toBe(false)
  })
})
