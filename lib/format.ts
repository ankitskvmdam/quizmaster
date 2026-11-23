const pad = (n: number) => String(n).padStart(2, '0')
const MINUS = '−'

/** Countdown display: "42:07", or "1:02:05" from an hour. Never negative. */
export function formatTimer(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  return h > 0 ? `${h}:${pad(m)}:${pad(r)}` : `${pad(m)}:${pad(r)}`
}

/** Time taken: "42m 07s", or "1h 05m" from an hour. */
export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h ${pad(m)}m` : `${m}m ${pad(s % 60)}s`
}

/** A test's length: "60 min". */
export function formatMinutes(sec: number): string {
  return `${Math.round(sec / 60)} min`
}

/** Marks with an explicit sign and a real minus: "+2", "−0.66", "0". */
export function formatMarks(n: number): string {
  if (n === 0) return '0'
  const abs = String(Math.round(Math.abs(n) * 100) / 100)
  return n > 0 ? `+${abs}` : `${MINUS}${abs}`
}

/** A score: "13.34", "−1.32". */
export function formatScore(n: number): string {
  const v = Math.round(n * 100) / 100
  return v < 0 ? `${MINUS}${Math.abs(v)}` : String(v)
}

/** A 0–1 ratio as a whole percent: "67%". */
export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "3 Nov 2026" in the viewer's local time. */
export function formatDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

/** "23 Nov 2026, 18:15" in the viewer's local time. */
export function formatDateTime(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return `${formatDate(date)}, ${pad(date.getHours())}:${pad(date.getMinutes())}`
}
