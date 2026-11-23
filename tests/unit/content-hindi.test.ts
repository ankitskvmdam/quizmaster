import { describe, expect, it } from 'vitest'
import { ContentError, loadContent } from '@/lib/content/load'

const ROOT = 'tests/fixtures/content-hi'

async function problems(root: string): Promise<string[]> {
  try {
    await loadContent(root)
    return []
  } catch (e) {
    if (!(e instanceof ContentError)) throw e
    return e.issues.map((i) => `${i.file}: ${i.message}`)
  }
}

describe('loadContent: Hindi translations', () => {
  it('does not treat the translations folder as a course', async () => {
    const b = await loadContent(ROOT)
    expect(b.subjects.map((s) => s.slug)).toEqual(['gs'])
  })

  it('attaches Hindi names to the course and the nodes that have them', async () => {
    const b = await loadContent(ROOT)
    expect(b.subjects[0]).toMatchObject({ name: 'General Studies', name_hi: 'सामान्य अध्ययन', description_hi: 'फिक्स्चर पाठ्यक्रम।' })
    expect(b.topics.find((t) => t.path === 'history')).toMatchObject({ name_hi: 'इतिहास' })
    expect(b.topics.find((t) => t.path === 'history/ancient')?.name_hi ?? null).toBeNull()
  })

  it('attaches Hindi lesson, book and chapter text', async () => {
    const b = await loadContent(ROOT)
    expect(b.lessons[0]).toMatchObject({ title_hi: 'मौर्य', body_md_hi: 'मौर्य साम्राज्य की स्थापना **चंद्रगुप्त मौर्य** ने की थी।\n' })
    expect(b.books[0]).toMatchObject({ title_hi: 'प्राचीन भारत', description_hi: 'फिक्स्चर पुस्तक।' })
    const ch = b.chapters.find((c) => c.slug === 'mauryas')!
    expect(ch.title_hi).toBe('मौर्य')
    expect(ch.gist_md_hi).toMatch(/^## Gist\nपहले/)
  })

  it('attaches Hindi question text, leaving untranslated questions English-only', async () => {
    const b = await loadContent(ROOT)
    expect(b.questions.find((q) => q.slug === 'fx-tree-1')).toMatchObject({
      stem_md_hi: 'मौर्य साम्राज्य के संस्थापक?',
      options_hi: [
        { key: 'A', text_md: 'चंद्रगुप्त' },
        { key: 'B', text_md: 'अशोक' },
      ],
      explanation_md_hi: 'चंद्रगुप्त मौर्य।',
    })
    expect(b.questions.find((q) => q.slug === 'fx-tree-2')?.stem_md_hi ?? null).toBeNull()
  })

  it('names a translated chapter quiz in Hindi', async () => {
    const b = await loadContent(ROOT)
    expect(b.tests.find((t) => t.chapterRef?.endsWith('/mauryas'))).toMatchObject({ title: 'The Mauryas quiz', title_hi: 'मौर्य प्रश्नोत्तरी' })
  })

  it('rejects translations that change facts, structure or have no English original', async () => {
    const p = await problems('tests/fixtures/content-hi-invalid')
    const has = (file: string, text: string) => expect(p.some((x) => x.includes(file) && x.includes(text)), `${file} ~ ${text}\n${p.join('\n')}`).toBe(true)
    has('translations/hi/gs/history/topic.yaml', 'position')
    has('ancient/india/questions.yaml', 'fx-tree-1: answer')
    has('ancient/india/questions.yaml', 'fx-tree-2: difficulty')
    has('ancient/india/questions.yaml', 'fx-tree-404')
    has('ancient/india/questions.yaml', 'fx-ch-2')
    has('01-mauryas.quiz.yaml', 'fx-ch-1: option')
    has('books/ancient-india/01-mauryas.md', '## Gist')
    has('history/medieval/topic.yaml', 'no English original')
    expect(p).toHaveLength(8)
  })
})
