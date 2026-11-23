// --prune removes syllabus nodes the files dropped, but only empty ones (nothing hangs off them).
// Runs after the other push tests (file-name order) in the same freshly reset database.
import { cpSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

process.loadEnvFile('.env.local')
const { createAdminClient } = await import('@/lib/supabase/admin')
const { loadContent } = await import('@/lib/content/load')
const { pushContent } = await import('@/lib/content/push')

const db = createAdminClient()
const work = mkdtempSync(path.join(tmpdir(), 'qm-prune-'))
afterAll(() => rmSync(work, { recursive: true, force: true }))
const push = async (root: string, prune: boolean, dry = false) => pushContent(await loadContent(root), db, { dry, prune })
const nodeExists = async (p: string) => ((await db.from('topics').select('id').eq('path', p)).data ?? []).length > 0

describe('pruning syllabus nodes', () => {
  beforeAll(async () => {
    await push('tests/fixtures/content-tree', false)
    cpSync('tests/fixtures/content-tree', work, { recursive: true })
    rmSync(path.join(work, 'gs/history/ancient/world'), { recursive: true }) // an empty node
  })

  it('reports the empty node in a dry run without deleting it', async () => {
    const s = await push(work, true, true)
    expect(s.topics.removed).toBe(1)
    expect(await nodeExists('history/ancient/world')).toBe(true)
  })

  it('deletes the empty node on a real prune', async () => {
    const s = await push(work, true)
    expect(s.topics.removed).toBe(1)
    expect(await nodeExists('history/ancient/world')).toBe(false)
  })

  it('keeps a dropped node that still has questions or notes', async () => {
    const civicsOnly = mkdtempSync(path.join(tmpdir(), 'qm-prune2-'))
    try {
      cpSync(work, civicsOnly, { recursive: true })
      // Dropping the whole History subject: its nodes have lessons, questions and a book, so none may be deleted.
      rmSync(path.join(civicsOnly, 'gs/history'), { recursive: true })
      const s = await push(civicsOnly, true, true)
      expect(s.topics.removed).toBe(0)
    } finally {
      rmSync(civicsOnly, { recursive: true, force: true })
    }
  })
})
