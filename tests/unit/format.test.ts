import { describe, expect, it } from 'vitest'
import { formatDate, formatDateTime, formatDuration, formatMarks, formatMinutes, formatPercent, formatTimer } from '@/lib/format'

describe('formatTimer', () => {
  it('shows MM:SS under an hour', () => {
    expect(formatTimer(2527)).toBe('42:07')
    expect(formatTimer(300)).toBe('05:00')
  })
  it('shows H:MM:SS from an hour', () => {
    expect(formatTimer(3725)).toBe('1:02:05')
  })
  it('clamps negative time at zero and floors fractions', () => {
    expect(formatTimer(-4)).toBe('00:00')
    expect(formatTimer(59.9)).toBe('00:59')
  })
})

describe('formatDuration', () => {
  it('uses minutes and seconds under an hour', () => {
    expect(formatDuration(2527)).toBe('42m 07s')
  })
  it('uses hours and minutes from an hour', () => {
    expect(formatDuration(3900)).toBe('1h 05m')
  })
})

describe('formatMinutes', () => {
  it('shows a test length in minutes', () => {
    expect(formatMinutes(3600)).toBe('60 min')
    expect(formatMinutes(900)).toBe('15 min')
  })
})

describe('formatMarks', () => {
  it('uses a real minus sign and an explicit plus', () => {
    expect(formatMarks(-0.66)).toBe('−0.66')
    expect(formatMarks(2)).toBe('+2')
    expect(formatMarks(0)).toBe('0')
  })
})

describe('formatPercent', () => {
  it('rounds to whole percent', () => {
    expect(formatPercent(0.666)).toBe('67%')
  })
})

describe('formatDateTime / formatDate', () => {
  it('formats as "23 Nov 2026, 18:15"', () => {
    expect(formatDateTime(new Date(2026, 10, 23, 18, 15))).toBe('23 Nov 2026, 18:15')
    expect(formatDate(new Date(2026, 10, 3))).toBe('3 Nov 2026')
  })
})
