import { describe, expect, it } from 'vitest'
import {
  addMonths,
  calendarPeriods,
  dateToMonth,
  formatMonth,
  formatMonthShort,
  formatRange,
  isMonthKey,
  monthToDate,
  monthsBetween,
  parsePeriod,
  rollingPeriod,
} from '@/lib/periods'

describe('month keys', () => {
  it('accepts only YYYY-MM with a real month', () => {
    expect(isMonthKey('2026-01')).toBe(true)
    expect(isMonthKey('2026-12')).toBe(true)
    expect(isMonthKey('2026-13')).toBe(false)
    expect(isMonthKey('2026-00')).toBe(false)
    expect(isMonthKey('2026-1')).toBe(false)
    expect(isMonthKey('26-01')).toBe(false)
  })
  it('converts to and from the first-of-month date', () => {
    expect(monthToDate('2026-01')).toBe('2026-01-01')
    expect(dateToMonth('2026-01-01')).toBe('2026-01')
    expect(dateToMonth('2026-11-30T00:00:00Z')).toBe('2026-11')
  })
  it('adds months across years in both directions', () => {
    expect(addMonths('2026-11', 3)).toBe('2027-02')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
  })
  it('lists the months between two keys, inclusive', () => {
    expect(monthsBetween('2026-11', '2027-01')).toEqual(['2026-11', '2026-12', '2027-01'])
    expect(monthsBetween('2026-03', '2026-01')).toEqual([])
  })
})

describe('labels', () => {
  it('formats a month long and short', () => {
    expect(formatMonth('2026-01')).toBe('January 2026')
    expect(formatMonthShort('2026-01')).toBe('Jan 2026')
  })
  it('formats ranges within a year, across years, and a single month', () => {
    expect(formatRange('2026-01', '2026-03')).toBe('Jan–Mar 2026')
    expect(formatRange('2026-11', '2027-01')).toBe('Nov 2026–Jan 2027')
    expect(formatRange('2026-01', '2026-01')).toBe('January 2026')
  })
})

describe('calendarPeriods', () => {
  it('lists years, halves and quarters that contain a published month, newest first within each kind', () => {
    expect(calendarPeriods(['2026-01', '2026-02', '2026-05'])).toEqual([
      { kind: 'year', label: '2026', from: '2026-01', to: '2026-12' },
      { kind: 'half', label: 'Jan–Jun 2026', from: '2026-01', to: '2026-06' },
      { kind: 'quarter', label: 'Apr–Jun 2026', from: '2026-04', to: '2026-06' },
      { kind: 'quarter', label: 'Jan–Mar 2026', from: '2026-01', to: '2026-03' },
    ])
  })
  it('is empty without months', () => {
    expect(calendarPeriods([])).toEqual([])
  })
})

describe('rollingPeriod', () => {
  it('ends at the chosen month and crosses year boundaries', () => {
    expect(rollingPeriod('2027-01', 3)).toEqual({
      kind: 'rolling',
      label: 'Last 3 months to Jan 2027',
      from: '2026-11',
      to: '2027-01',
    })
  })
})

describe('parsePeriod', () => {
  it('reads a valid range', () => {
    expect(parsePeriod('2026-01', '2026-03')).toEqual({ kind: 'custom', label: 'Jan–Mar 2026', from: '2026-01', to: '2026-03' })
  })
  it('clamps anything longer than 12 months to the 12 ending at to', () => {
    expect(parsePeriod('2026-01', '2027-06')).toEqual({
      kind: 'custom',
      label: 'Jul 2026–Jun 2027',
      from: '2026-07',
      to: '2027-06',
    })
  })
  it('rejects reversed, malformed or missing input', () => {
    expect(parsePeriod('2026-03', '2026-01')).toBeNull()
    expect(parsePeriod('x', '2026-01')).toBeNull()
    expect(parsePeriod(undefined, undefined)).toBeNull()
  })
})
