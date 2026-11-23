import { describe, expect, it } from 'vitest'
import { safeNext } from '@/lib/safe-next'

describe('safeNext', () => {
  it('keeps a same-site path with its query', () => {
    expect(safeNext('/tests?x=1')).toBe('/tests?x=1')
  })
  it('falls back for protocol-relative, absolute and backslash URLs', () => {
    expect(safeNext('//evil.com')).toBe('/study')
    expect(safeNext('https://evil.com')).toBe('/study')
    expect(safeNext('/\\evil.com')).toBe('/study')
  })
  it('falls back when a tab or newline would make the browser read it as //host', () => {
    expect(safeNext('/\t/evil.com')).toBe('/study')
    expect(safeNext('/\n/evil.com')).toBe('/study')
    expect(safeNext('/\r\n/evil.com/phish')).toBe('/study')
    expect(safeNext('\t//evil.com')).toBe('/study')
  })
  it('keeps the path, query and hash of a same-site URL', () => {
    expect(safeNext('/past?page=2#mine')).toBe('/past?page=2#mine')
  })
  it('falls back for missing values', () => {
    expect(safeNext(null)).toBe('/study')
    expect(safeNext(undefined, '/past')).toBe('/past')
  })
})
