import { describe, expect, it } from 'vitest'
import { callSafely, OFFLINE_MESSAGE } from '@/lib/runner/safe-call'

describe('callSafely', () => {
  it('returns the action result when it succeeds', async () => {
    expect(await callSafely(async () => ({ ok: true }), { ok: false })).toEqual({ ok: true })
  })
  it('returns the fallback when the request fails (offline, dead connection)', async () => {
    const r = await callSafely(async () => {
      throw new TypeError('Failed to fetch')
    }, { ok: false, error: OFFLINE_MESSAGE })
    expect(r).toEqual({ ok: false, error: "Couldn't reach the server. Check your connection; we'll keep trying." })
  })
  it("lets Next's redirect through so navigation still happens", async () => {
    const redirect = Object.assign(new Error('NEXT_REDIRECT'), { digest: 'NEXT_REDIRECT;push;/past/attempts/x;303;' })
    await expect(callSafely(async () => { throw redirect }, null)).rejects.toBe(redirect)
  })
})
