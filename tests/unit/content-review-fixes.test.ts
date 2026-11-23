// Loader checks added after the whole-branch review: derived quiz slug collisions, repeated covers tags, and Hindi
// translations that change numbers, fold a line into a list or repeat a question.
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ContentError, loadContent } from '@/lib/content/load'

let root: string
const put = async (rel: string, text: string) => {
  await mkdir(path.dirname(path.join(root, rel)), { recursive: true })
  await writeFile(path.join(root, rel), text)
}
const problems = async () => {
  try {
    await loadContent(root)
    return []
  } catch (e) {
    if (!(e instanceof ContentError)) throw e
    return e.issues.map((i) => `${i.file}: ${i.message}`)
  }
}
const chapter = (slug: string, n: number, covers = '[modern]') =>
  `---\nslug: ${slug}\nnumber: ${n}\ntitle: T\ncovers: ${covers}\n---\n## Gist\nx\n\n## Key facts\n- **y**\n`
const quiz = (slug: string) =>
  `- { slug: ${slug}, difficulty: easy, stem: "In which year?", options: { A: "1857", B: "1858" }, answer: A, explanation: "In 1857." }\n`

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'qm-review-'))
  await put('gs/course.yaml', 'slug: gs\nname: GS\nposition: 1\n')
  await put('gs/history/topic.yaml', 'slug: history\nname: History\nposition: 1\n')
  await put('gs/history/modern/topic.yaml', 'slug: modern\nname: Modern\nposition: 1\n')
  await put('gs/history/books/b/book.yaml', 'title: B\nposition: 1\n')
})
afterEach(() => rm(root, { recursive: true, force: true }))

describe('derived quiz slugs', () => {
  it('rejects two chapter quizzes that would get the same test slug', async () => {
    // history/books/a-b/c  and  history/books/a/b-c  both become book-history-a-b-c
    await put('gs/history/books/a-b/book.yaml', 'title: AB\nposition: 2\n')
    await put('gs/history/books/a-b/01-c.md', chapter('c', 1))
    await put('gs/history/books/a-b/01-c.quiz.yaml', quiz('q-1'))
    await put('gs/history/books/a/book.yaml', 'title: A\nposition: 3\n')
    await put('gs/history/books/a/01-b-c.md', chapter('b-c', 1))
    await put('gs/history/books/a/01-b-c.quiz.yaml', quiz('q-2'))
    expect((await problems()).some((p) => p.includes('book-history-a-b-c') && p.includes('duplicate test slug'))).toBe(true)
  })
})

describe('chapter covers', () => {
  it('rejects a node listed twice in covers', async () => {
    await put('gs/history/books/b/01-x.md', chapter('x', 1, '[modern, modern]'))
    expect(await problems()).toEqual(['gs/history/books/b/01-x.md: x: covers lists "modern" more than once'])
  })
})

describe('Hindi translations', () => {
  beforeEach(async () => {
    await put('gs/history/books/b/01-x.md', chapter('x', 1))
    await put('gs/history/books/b/01-x.quiz.yaml', quiz('q-1'))
  })
  const hi = (text: string) => put('translations/hi/gs/history/books/b/01-x.quiz.yaml', text)

  it('accepts a faithful translation', async () => {
    await hi(`- { slug: q-1, difficulty: easy, stem: "किस वर्ष?", options: { A: "1857", B: "1858" }, answer: A, explanation: "1857 में।" }\n`)
    expect(await problems()).toEqual([])
  })

  it('rejects options whose numbers differ from the English (a swapped or stale year)', async () => {
    await hi(`- { slug: q-1, difficulty: easy, stem: "किस वर्ष?", options: { A: "1858", B: "1857" }, answer: A, explanation: "1857 में।" }\n`)
    expect(await problems()).toEqual([
      'translations/hi/gs/history/books/b/01-x.quiz.yaml: q-1: option A numbers must match the English (1857)',
      'translations/hi/gs/history/books/b/01-x.quiz.yaml: q-1: option B numbers must match the English (1858)',
    ])
  })

  it('rejects a stem or explanation whose numbers differ', async () => {
    await hi(`- { slug: q-1, difficulty: easy, stem: "1905 में किस वर्ष?", options: { A: "1857", B: "1858" }, answer: A, explanation: "1858 में।" }\n`)
    const p = await problems()
    expect(p.some((x) => x.includes('q-1: stem numbers'))).toBe(true)
    expect(p.some((x) => x.includes('q-1: explanation numbers'))).toBe(true)
  })

  it('rejects a Hindi stem with a line folded into a list', async () => {
    await put('gs/history/books/b/01-x.quiz.yaml', `- slug: q-1\n  difficulty: hard\n  stem: |\n    Consider:\n    1. One.\n    2. Two.\n\n    Which is correct?\n  options: { A: "1 only", B: "2 only" }\n  answer: A\n  explanation: x\n`)
    await hi(`- slug: q-1\n  difficulty: hard\n  stem: |\n    विचार कीजिए:\n    1. एक।\n    2. दो।\n    कौन सही है?\n  options: { A: "केवल 1", B: "केवल 2" }\n  answer: A\n  explanation: क\n`)
    expect((await problems()).some((p) => p.includes('q-1: stem: put a blank line'))).toBe(true)
  })

  it('rejects a question repeated in one Hindi file', async () => {
    const q = `- { slug: q-1, difficulty: easy, stem: "किस वर्ष?", options: { A: "1857", B: "1858" }, answer: A, explanation: "1857 में।" }\n`
    await hi(q + q)
    expect((await problems()).some((p) => p.includes('q-1: appears more than once'))).toBe(true)
  })
})
