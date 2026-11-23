import { describe, expect, it } from 'vitest'
import { parsePreference, resolveTheme, themeHeadScript, THEME_STORAGE_KEY } from '@/lib/theme'

describe('parsePreference', () => {
  it('defaults to system for missing or unknown values', () => {
    expect(parsePreference(null)).toBe('system')
    expect(parsePreference('bogus')).toBe('system')
  })
  it('keeps a valid preference', () => {
    expect(parsePreference('dark')).toBe('dark')
    expect(parsePreference('light')).toBe('light')
  })
})

describe('resolveTheme', () => {
  it('follows the OS when the preference is system', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
  })
  it('uses an explicit preference over the OS', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })
})

describe('themeHeadScript', () => {
  it('reads the gs.theme key', () => {
    expect(THEME_STORAGE_KEY).toBe('gs.theme')
    expect(themeHeadScript).toContain('gs.theme')
  })
})
