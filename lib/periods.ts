/** A calendar month as 'YYYY-MM'. Pure string arithmetic: no Date, so no time-zone surprises. */
export type MonthKey = string

export type Period = {
  kind: 'quarter' | 'half' | 'year' | 'rolling' | 'custom'
  label: string
  from: MonthKey
  to: MonthKey
}

const LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DASH = '–'
export const MAX_PERIOD_MONTHS = 12

export function isMonthKey(s: string): boolean {
  const m = /^(\d{4})-(\d{2})$/.exec(s)
  return Boolean(m) && Number(m![2]) >= 1 && Number(m![2]) <= 12
}

const split = (k: MonthKey) => [Number(k.slice(0, 4)), Number(k.slice(5, 7))] as const
const index = (k: MonthKey) => {
  const [y, m] = split(k)
  return y * 12 + (m - 1)
}
const fromIndex = (i: number): MonthKey => `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`

export const monthToDate = (k: MonthKey) => `${k}-01`
export const dateToMonth = (d: string): MonthKey => d.slice(0, 7)
export const addMonths = (k: MonthKey, n: number): MonthKey => fromIndex(index(k) + n)
export const monthSpan = (from: MonthKey, to: MonthKey) => index(to) - index(from) + 1

export function monthsBetween(from: MonthKey, to: MonthKey): MonthKey[] {
  const out: MonthKey[] = []
  for (let i = index(from); i <= index(to); i++) out.push(fromIndex(i))
  return out
}

export const formatMonth = (k: MonthKey) => `${LONG[split(k)[1] - 1]} ${split(k)[0]}`
export const formatMonthShort = (k: MonthKey) => `${SHORT[split(k)[1] - 1]} ${split(k)[0]}`

/** "January 2026", "Jan–Mar 2026", "Nov 2026–Jan 2027". */
export function formatRange(from: MonthKey, to: MonthKey): string {
  if (from === to) return formatMonth(from)
  const [fy, fm] = split(from)
  const [ty, tm] = split(to)
  if (fy === ty) return `${SHORT[fm - 1]}${DASH}${SHORT[tm - 1]} ${ty}`
  return `${formatMonthShort(from)}${DASH}${formatMonthShort(to)}`
}

/** Years, then halves, then quarters (each newest first) that contain at least one published month. */
export function calendarPeriods(published: MonthKey[]): Period[] {
  const years = new Set<number>()
  const halves = new Set<string>()
  const quarters = new Set<string>()
  for (const k of published) {
    const [y, m] = split(k)
    years.add(y)
    halves.add(`${y}-${m <= 6 ? 1 : 2}`)
    quarters.add(`${y}-${Math.ceil(m / 3)}`)
  }
  const block = (kind: 'half' | 'quarter', y: number, n: number, size: number): Period => {
    const from = `${y}-${String((n - 1) * size + 1).padStart(2, '0')}`
    const to = `${y}-${String(n * size).padStart(2, '0')}`
    return { kind, label: formatRange(from, to), from, to }
  }
  const desc = (a: string, b: string) => {
    const [ay, an] = a.split('-').map(Number)
    const [by, bn] = b.split('-').map(Number)
    return by - ay || bn - an
  }
  return [
    ...[...years].sort((a, b) => b - a).map((y): Period => ({ kind: 'year', label: String(y), from: `${y}-01`, to: `${y}-12` })),
    ...[...halves].sort(desc).map((h) => block('half', Number(h.split('-')[0]), Number(h.split('-')[1]), 6)),
    ...[...quarters].sort(desc).map((q) => block('quarter', Number(q.split('-')[0]), Number(q.split('-')[1]), 3)),
  ]
}

export function rollingPeriod(end: MonthKey, n: 3 | 6 | 12): Period {
  return { kind: 'rolling', label: `Last ${n} months to ${formatMonthShort(end)}`, from: addMonths(end, -(n - 1)), to: end }
}

/** A from/to pair from the URL. Null if malformed or reversed; longer than 12 months is clamped to the 12 ending at `to`. */
export function parsePeriod(from?: string, to?: string): Period | null {
  if (!from || !to || !isMonthKey(from) || !isMonthKey(to) || index(from) > index(to)) return null
  const start = monthSpan(from, to) > MAX_PERIOD_MONTHS ? addMonths(to, -(MAX_PERIOD_MONTHS - 1)) : from
  return { kind: 'custom', label: formatRange(start, to), from: start, to }
}
