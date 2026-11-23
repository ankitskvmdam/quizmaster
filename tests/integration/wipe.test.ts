// Runs last (alphabetical): wipes every content row pushed by the earlier integration suites.
import { beforeAll, describe, expect, it } from 'vitest'

process.loadEnvFile('.env.local')
const { createAdminClient } = await import('@/lib/supabase/admin')
const { wipeContent, CONTENT_TABLES } = await import('@/lib/content/wipe')
const { loadContent } = await import('@/lib/content/load')
const { pushContent } = await import('@/lib/content/push')

const db = createAdminClient()
const count = async (table: string) =>
  (await db.from(table as 'subjects').select('*', { count: 'exact', head: true })).count ?? 0

describe('wiping content', () => {
  beforeAll(async () => {
    // Make sure there is content and an invite to keep, whatever ran before.
    await pushContent(await loadContent('tests/fixtures/content-tree'), db, { dry: false, prune: false })
    await db.from('allowed_emails').upsert({ email: 'keep-me@test.dev' }, { onConflict: 'email', ignoreDuplicates: true })
  })

  it('only counts without --yes', async () => {
    const before = await count('questions')
    expect(before).toBeGreaterThan(0)
    const counts = await wipeContent(db, { yes: false })
    expect(counts.questions).toBe(before)
    expect(await count('questions')).toBe(before)
  })

  it('deletes every content row and attempt, and keeps people', async () => {
    const invites = await count('allowed_emails')
    const profiles = await count('profiles')
    expect(invites).toBeGreaterThan(0)
    await wipeContent(db, { yes: true })
    for (const t of CONTENT_TABLES) expect(await count(t), t).toBe(0)
    expect(await count('attempts')).toBe(0)
    expect(await count('allowed_emails')).toBe(invites)
    expect(await count('profiles')).toBe(profiles)
  })
})
