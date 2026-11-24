import { describe, expect, it } from 'vitest'
import { ContentError, loadContent } from '@/lib/content/load'

const ROOT = 'tests/fixtures/content-tree'

describe('loadContent: courses and syllabus trees', () => {
  it('reads a course from course.yaml', async () => {
    const b = await loadContent(ROOT)
    expect(b.subjects.map((s) => [s.slug, s.name])).toEqual([['gs', 'General Studies']])
  })

  it('reads nested nodes with their paths and parents', async () => {
    const b = await loadContent(ROOT)
    expect(b.topics.map((t) => [t.path, t.parentPath, t.slug])).toEqual([
      ['civics', null, 'civics'],
      ['history', null, 'history'],
      ['history/ancient', 'history', 'ancient'],
      ['history/ancient/india', 'history/ancient', 'india'],
      ['history/ancient/world', 'history/ancient', 'world'],
    ])
  })

  it('attaches lessons and questions to the node they sit in', async () => {
    const b = await loadContent(ROOT)
    expect(b.lessons.map((l) => [l.topicPath, l.slug])).toEqual([['history/ancient/india', 'mauryas']])
    expect(b.questions.find((q) => q.slug === 'fx-tree-1')).toMatchObject({ topicRef: 'gs/history/ancient/india', chapterRef: null })
  })

  it('reads books and chapters with full syllabus tags and the gist body', async () => {
    const b = await loadContent(ROOT)
    expect(b.books).toEqual([
      {
        subjectSlug: 'gs',
        topicPath: 'history',
        slug: 'ancient-india',
        title: 'Ancient India',
        author: 'A. Author',
        edition: '2nd',
        description: 'Fixture book.',
        position: 1,
        published: true,
      },
    ])
    expect(b.chapters.map((c) => [c.bookRef, c.slug, c.number, c.covers])).toEqual([
      ['gs/history/ancient-india', 'mauryas', 1, ['history/ancient/india']],
      ['gs/history/ancient-india', 'guptas', 2, ['history/ancient/india', 'history/ancient']],
    ])
    expect(b.chapters[0].gist_md).toContain('## Key facts')
  })

  it("turns a chapter's quiz into its questions and a practice-only chapter test", async () => {
    const b = await loadContent(ROOT)
    expect(b.questions.filter((q) => q.chapterRef).map((q) => [q.slug, q.chapterRef, q.topicRef])).toEqual([
      ['fx-ch-1', 'gs/history/ancient-india/mauryas', null],
      ['fx-ch-2', 'gs/history/ancient-india/mauryas', null],
    ])
    expect(b.tests).toEqual([
      {
        slug: 'book-history-ancient-india-mauryas',
        title: 'The Mauryas quiz',
        kind: 'chapter',
        subjectSlug: 'gs',
        year: null,
        durationSec: null,
        marksCorrect: 1,
        marksWrong: 0,
        published: true,
        questionSlugs: ['fx-ch-1', 'fx-ch-2'],
        caMonthRef: null,
        chapterRef: 'gs/history/ancient-india/mauryas',
        examSlug: null,
        paperDate: null,
        paperLabel: null,
      },
    ])
  })
})

describe('loadContent: tree and book validation', () => {
  it('reports every problem', async () => {
    const err = await loadContent('tests/fixtures/content-tree-invalid').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ContentError)
    const messages = (err as ContentError).issues.map((i) => i.message)
    expect(messages).toHaveLength(6)
    expect(messages.filter((m) => m.includes('reserved'))).toHaveLength(2) // current-affairs and a nested books folder
    for (const fragment of ['nowhere', 'clashes', 'Key facts', 'number 1']) {
      expect(messages.some((m) => m.includes(fragment)), fragment).toBe(true)
    }
  })
})
