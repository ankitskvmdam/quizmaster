// Pushes Hindi translations on top of the syllabus-tree fixture. Runs after push-tree.test.ts (file-name order) in the
// same freshly reset database, so the English rows already exist.
import { beforeAll, describe, expect, it } from 'vitest'

process.loadEnvFile('.env.local')
const { createAdminClient } = await import('@/lib/supabase/admin')
const { loadContent } = await import('@/lib/content/load')
const { pushContent } = await import('@/lib/content/push')

const db = createAdminClient()
const push = async (root: string) => pushContent(await loadContent(root), db, { dry: false, prune: false })

describe('pushing Hindi translations', () => {
  // Start from the plain English fixture (the tree test leaves edited copies behind).
  beforeAll(() => push('tests/fixtures/content-tree'))

  it('writes the Hindi text beside the English', async () => {
    const s = await push('tests/fixtures/content-hi')
    expect(s.subjects.updated).toBe(1)
    expect(s.topics.updated).toBe(1)
    expect(s.lessons.updated).toBe(1)
    expect(s.books.updated).toBe(1)
    expect(s.chapters.updated).toBe(1)
    expect(s.questions.updated).toBe(2)
    expect(s.tests.updated).toBe(1)

    const { data: course } = await db.from('subjects').select('name, name_hi').eq('slug', 'gs').single()
    expect(course).toEqual({ name: 'General Studies', name_hi: 'सामान्य अध्ययन' })
    const { data: ch } = await db.from('book_chapters').select('title_hi, gist_md_hi').eq('slug', 'mauryas').single()
    expect(ch?.title_hi).toBe('मौर्य')
    expect(ch?.gist_md_hi).toMatch(/^## Gist\nपहले/)
    const { data: q } = await db.from('questions').select('stem_md_hi, options_hi, explanation_md_hi, correct_key').eq('slug', 'fx-tree-1').single()
    expect(q).toEqual({
      stem_md_hi: 'मौर्य साम्राज्य के संस्थापक?',
      options_hi: [
        { key: 'A', text_md: 'चंद्रगुप्त' },
        { key: 'B', text_md: 'अशोक' },
      ],
      explanation_md_hi: 'चंद्रगुप्त मौर्य।',
      correct_key: 'A',
    })
    const { data: quiz } = await db.from('tests').select('title_hi').eq('slug', 'book-history-ancient-india-mauryas').single()
    expect(quiz?.title_hi).toBe('मौर्य प्रश्नोत्तरी')
  })

  it('leaves everything unchanged on a second push', async () => {
    const s = await push('tests/fixtures/content-hi')
    for (const kind of ['subjects', 'topics', 'lessons', 'books', 'chapters', 'questions', 'tests'] as const) {
      expect(s[kind].updated, kind).toBe(0)
    }
  })

  it('clears Hindi text whose translation was removed', async () => {
    const s = await push('tests/fixtures/content-tree')
    expect(s.questions.updated).toBe(2)
    const { data } = await db.from('questions').select('stem_md_hi, options_hi, explanation_md_hi').eq('slug', 'fx-tree-1').single()
    expect(data).toEqual({ stem_md_hi: null, options_hi: null, explanation_md_hi: null })
  })
})
