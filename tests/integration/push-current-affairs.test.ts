// Pushes the current-affairs fixture into a freshly reset local database and checks what lands there.
// Run with `npm run test:integration` (it resets the local database first).
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

process.loadEnvFile('.env.local')
const { createAdminClient } = await import('@/lib/supabase/admin')
const { loadContent, ContentError } = await import('@/lib/content/load')
const { pushContent } = await import('@/lib/content/push')

const db = createAdminClient()
const FIXTURE = 'tests/fixtures/content-ca'
const work = mkdtempSync(path.join(tmpdir(), 'qm-push-'))

/** A scratch copy of the fixture, changed by `edit(root)`. */
function variant(name: string, edit: (root: string) => void) {
  const root = path.join(work, name)
  cpSync(FIXTURE, root, { recursive: true })
  edit(root)
  return root
}
function replaceIn(file: string, from: string, to: string) {
  const s = readFileSync(file, 'utf8')
  if (!s.includes(from)) throw new Error(`fixture text not found in ${file}: ${from}`)
  writeFileSync(file, s.replace(from, to))
}
function dropLines(file: string, needle: string) {
  writeFileSync(file, readFileSync(file, 'utf8').split('\n').filter((l) => !l.includes(needle)).join('\n'))
}
const push = async (root: string, opts: { prune?: boolean; force?: boolean } = {}) =>
  pushContent(await loadContent(root), db, { dry: false, prune: opts.prune ?? false, force: opts.force })
const jan = (root: string) => path.join(root, 'gs/current-affairs/2099-01')

afterAll(() => rmSync(work, { recursive: true, force: true }))

describe('pushing monthly current affairs', () => {
  beforeAll(async () => {
    const { count } = await db.from('subjects').select('id', { count: 'exact', head: true })
    if (count) throw new Error('Run with `npm run test:integration`: it needs a freshly reset local database.')
  })

  it('creates sections, categories, months, notes, questions and the month paper', async () => {
    const s = await push(FIXTURE)
    expect(s.sections.created).toBe(2)
    expect(s.categories.created).toBe(4)
    expect(s.months.created).toBe(2)
    expect(s.notes.created).toBe(7)
    expect(s.questions.created).toBe(10)
    expect(s.tests.created).toBe(1)
  })

  it('changes nothing on a second push', async () => {
    const s = await push(FIXTURE)
    for (const [kind, c] of Object.entries(s)) expect(c.created + c.updated, kind).toBe(0)
  })

  it('updates exactly the edited note and the question moved to another category', async () => {
    const root = variant('edit', (r) => {
      replaceIn(path.join(jan(r), 'notes.yaml'), '**A** appointed …', '**A** appointed Chief Adviser.')
      replaceIn(path.join(jan(r), 'questions.yaml'), 'slug: fx-ca-2099-01-003, category: appointments', 'slug: fx-ca-2099-01-003, category: awards')
    })
    const s = await push(root)
    expect([s.notes.updated, s.questions.updated]).toEqual([1, 1])
    const { data } = await db.from('questions').select('ca_category_slug').eq('slug', 'fx-ca-2099-01-003').single()
    expect(data?.ca_category_slug).toBe('awards')
  })

  it('refuses to change an attempted month paper, even with over 1000 other attempts', async () => {
    const email = 'push-it@test.dev'
    await db.from('allowed_emails').insert({ email })
    const { data: u, error } = await db.auth.admin.createUser({ email, password: 'abcdefg1', email_confirm: true })
    if (error) throw error
    const userId = u.user.id
    // Plenty of unrelated attempts first, so a single unpaged read would miss the paper's attempt.
    const { data: custom } = await db.from('tests').insert({ title: 'Noise', kind: 'custom', created_by: userId }).select('id').single()
    const noise = Array.from({ length: 1200 }, () => ({ user_id: userId, test_id: custom!.id, mode: 'practice' as const }))
    for (let i = 0; i < noise.length; i += 500) await db.from('attempts').insert(noise.slice(i, i + 500))
    const { data: paper } = await db.from('tests').select('id').eq('slug', 'ca-current-affairs-2099-01').single()
    await db.from('attempts').insert({ user_id: userId, test_id: paper!.id, mode: 'timed' })

    const reordered = variant('reorder', (r) => {
      replaceIn(path.join(jan(r), 'test.yaml'), '[fx-ca-2099-01-001, fx-ca-2099-01-002,', '[fx-ca-2099-01-002, fx-ca-2099-01-001,')
    })
    const err = await push(reordered).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ContentError)
    expect((err as InstanceType<typeof ContentError>).issues[0].file).toBe('gs/current-affairs/2099-01/test.yaml')
  })

  it('prunes: hides a dropped month, deletes a dropped note, retires dropped questions, keeps the paper', async () => {
    const root = variant('prune', (r) => {
      rmSync(path.join(r, 'gs/current-affairs/2099-02'), { recursive: true })
      dropLines(path.join(jan(r), 'notes.yaml'), 'slug: n2,')
      dropLines(path.join(jan(r), 'questions.yaml'), 'fx-ca-2099-01-003')
    })
    const s = await push(root, { prune: true })
    expect(s.months.unpublished).toBe(1)
    expect(s.notes.removed).toBe(1)
    expect(s.questions.retired).toBe(3)

    const { data: feb } = await db.from('ca_months').select('id, published').eq('month', '2099-02-01').single()
    expect(feb?.published).toBe(false)
    const { count: febNotes } = await db.from('ca_notes').select('id', { count: 'exact', head: true }).eq('month_id', feb!.id)
    expect(febNotes).toBe(2) // kept, hidden with the month
    const { data: retired } = await db.from('questions').select('slug').eq('retired', true).order('slug')
    expect(retired?.map((q) => q.slug)).toEqual(['fx-ca-2099-01-003', 'fx-ca-2099-02-001', 'fx-ca-2099-02-002'])
    const { data: paper } = await db.from('tests').select('published, test_questions(count)').eq('slug', 'ca-current-affairs-2099-01').single()
    expect(paper?.published).toBe(true)
    expect(paper?.test_questions[0]?.count).toBe(5)
  })
})
