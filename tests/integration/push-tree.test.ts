// Pushes the syllabus-tree fixture (nested nodes, a book with chapter gists and a chapter quiz).
// Runs after push-current-affairs.test.ts in the same freshly reset database (`npm run test:integration`).
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

process.loadEnvFile('.env.local')
const { createAdminClient } = await import('@/lib/supabase/admin')
const { loadContent } = await import('@/lib/content/load')
const { pushContent } = await import('@/lib/content/push')

const db = createAdminClient()
const FIXTURE = 'tests/fixtures/content-tree'
const work = mkdtempSync(path.join(tmpdir(), 'qm-tree-'))
afterAll(() => rmSync(work, { recursive: true, force: true }))

const push = async (root: string, prune = false) => pushContent(await loadContent(root), db, { dry: false, prune })
const book = (root: string) => path.join(root, 'gs/history/books/ancient-india')
const topicId = async (p: string) =>
  (await db.from('topics').select('id, subjects!inner(slug)').eq('path', p).eq('subjects.slug', 'gs').single()).data!.id

describe('pushing a syllabus tree with books', () => {
  it('creates nested nodes, the book, its chapters, tags and the chapter quiz', async () => {
    const s = await push(FIXTURE)
    expect(s.topics.created).toBe(5)
    expect(s.books.created).toBe(1)
    expect(s.chapters.created).toBe(2)
    expect(s.tests.created).toBe(2) // the chapter quiz and the whole-book quiz

    const { data: india } = await db.from('topics').select('parent_id').eq('path', 'history/ancient/india').single()
    expect(india?.parent_id).toBe(await topicId('history/ancient'))

    const { data: guptas } = await db.from('book_chapters').select('id, chapter_topics(topic_id)').eq('slug', 'guptas').single()
    expect(guptas?.chapter_topics).toHaveLength(2)

    const { data: quiz } = await db
      .from('tests')
      .select('kind, duration_sec, chapter_id, test_questions(count)')
      .eq('slug', 'book-history-ancient-india-mauryas')
      .single()
    expect(quiz).toMatchObject({ kind: 'chapter', duration_sec: null })
    expect(quiz?.chapter_id).not.toBeNull()
    expect(quiz?.test_questions[0]?.count).toBe(2)

    // quiz.yaml: one quiz over the whole book, tied to the book rather than a chapter
    const { data: whole } = await db
      .from('tests')
      .select('kind, chapter_id, book_id, books(slug, kind), test_questions(count)')
      .eq('slug', 'book-history-ancient-india')
      .single()
    expect(whole).toMatchObject({ kind: 'chapter', chapter_id: null, books: { slug: 'ancient-india', kind: 'book' } })
    expect(whole?.test_questions[0]?.count).toBe(2)
  })

  it('changes nothing on a second push', async () => {
    const s = await push(FIXTURE)
    for (const k of ['topics', 'books', 'chapters', 'lessons', 'questions', 'tests'] as const) {
      expect(s[k].created + s[k].updated, k).toBe(0)
    }
  })

  it('re-tags a chapter when its covers change', async () => {
    const root = path.join(work, 'retag')
    cpSync(FIXTURE, root, { recursive: true })
    const f = path.join(book(root), '02-guptas.md')
    writeFileSync(f, readFileSync(f, 'utf8').replace('covers: [ancient/india, ancient]', 'covers: [ancient/world]'))
    const s = await push(root)
    expect(s.chapters.updated).toBe(1)
    const { data } = await db.from('book_chapters').select('chapter_topics(topic_id)').eq('slug', 'guptas').single()
    expect(data?.chapter_topics.map((t) => t.topic_id)).toEqual([await topicId('history/ancient/world')])
  })

  it('prunes a removed book: unpublished, its quiz unpublished, its questions retired', async () => {
    const root = path.join(work, 'nobook')
    cpSync(FIXTURE, root, { recursive: true })
    rmSync(book(root), { recursive: true })
    const s = await push(root, true)
    expect(s.books.unpublished).toBe(1)
    const { data: b } = await db.from('books').select('published').eq('slug', 'ancient-india').single()
    expect(b?.published).toBe(false)
    const { data: quiz } = await db.from('tests').select('published').eq('slug', 'book-history-ancient-india-mauryas').single()
    expect(quiz?.published).toBe(false)
    const { data: q } = await db.from('questions').select('retired').in('slug', ['fx-ch-1', 'fx-ch-2'])
    expect(q?.every((x) => x.retired)).toBe(true)
  })
})
