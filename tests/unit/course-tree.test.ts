import { describe, expect, it } from 'vitest'
import { buildTree, flattenLessons, resolvePath, type TreeInput } from '@/lib/courses/tree'

const input: TreeInput = {
  topics: [
    { id: 'h', parentId: null, path: 'history', slug: 'history', name: 'History', description: '', position: 1 },
    { id: 'c', parentId: null, path: 'civics', slug: 'civics', name: 'Civics', description: '', position: 2 },
    { id: 'a', parentId: 'h', path: 'history/ancient', slug: 'ancient', name: 'Ancient', description: '', position: 1 },
    { id: 'm', parentId: 'h', path: 'history/medieval', slug: 'medieval', name: 'Medieval', description: '', position: 2 },
    { id: 'ai', parentId: 'a', path: 'history/ancient/india', slug: 'india', name: 'India', description: '', position: 1 },
    { id: 'aw', parentId: 'a', path: 'history/ancient/world', slug: 'world', name: 'World', description: '', position: 2 },
  ],
  lessons: [
    { id: 'l2', topicId: 'ai', slug: 'guptas', title: 'Guptas', position: 2, done: false },
    { id: 'l1', topicId: 'ai', slug: 'mauryas', title: 'Mauryas', position: 1, done: true },
    { id: 'l3', topicId: 'aw', slug: 'rome', title: 'Rome', position: 1, done: false },
    { id: 'l4', topicId: 'm', slug: 'delhi', title: 'Delhi Sultanate', position: 1, done: false },
  ],
  questions: [
    { topicId: 'ai', chapterId: null },
    { topicId: 'ai', chapterId: null },
    { topicId: 'm', chapterId: null },
    { topicId: null, chapterId: 'ch1' },
  ],
  books: [{ id: 'b1', topicId: 'h', slug: 'ancient-india', title: 'Ancient India', author: 'A', edition: null, description: '', position: 1 }],
  chapters: [
    { id: 'ch2', bookId: 'b1', slug: 'guptas', number: 2, title: 'Guptas', read: false, coverIds: ['ai'] },
    { id: 'ch1', bookId: 'b1', slug: 'mauryas', number: 1, title: 'Mauryas', read: true, coverIds: ['ai'] },
  ],
}

describe('buildTree', () => {
  it('nests nodes in position order', () => {
    const t = buildTree(input)
    expect(t.roots.map((n) => n.slug)).toEqual(['history', 'civics'])
    expect(t.byPath.get('history')!.children.map((n) => n.slug)).toEqual(['ancient', 'medieval'])
    expect(t.byPath.get('history/ancient/india')!.lessons.map((l) => l.slug)).toEqual(['mauryas', 'guptas'])
  })

  it('rolls lessons and progress up the tree', () => {
    const t = buildTree(input)
    expect([t.byPath.get('history')!.lessonCount, t.byPath.get('history')!.doneCount]).toEqual([4, 1])
    expect([t.byPath.get('history/ancient')!.lessonCount, t.byPath.get('history/ancient')!.doneCount]).toEqual([3, 1])
    expect(t.byPath.get('civics')!.lessonCount).toBe(0)
  })

  it('counts practice questions over the subtree, plus quiz questions of chapters tagged inside it', () => {
    const t = buildTree(input)
    expect(t.byPath.get('history/ancient/india')!.questionCount).toBe(3)
    expect(t.byPath.get('history/ancient')!.questionCount).toBe(3)
    expect(t.byPath.get('history')!.questionCount).toBe(4)
    expect(t.byPath.get('history/ancient/world')!.questionCount).toBe(0)
  })

  it('puts books on their subject with chapters in number order and read counts', () => {
    const h = buildTree(input).byPath.get('history')!
    expect(h.books.map((b) => [b.slug, b.chapters.map((c) => c.number), b.chaptersRead])).toEqual([['ancient-india', [1, 2], 1]])
  })

  it('gives ancestors for breadcrumbs', () => {
    expect(buildTree(input).ancestors('history/ancient/india').map((n) => n.name)).toEqual(['History', 'Ancient'])
  })
})

describe('resolvePath', () => {
  const t = buildTree(input)
  it('resolves a node', () => {
    expect(resolvePath(t, ['history', 'ancient'])).toMatchObject({ kind: 'node', node: { path: 'history/ancient' } })
  })
  it('resolves a lesson in a node, with its neighbours', () => {
    const r = resolvePath(t, ['history', 'ancient', 'india', 'guptas'])
    expect(r).toMatchObject({ kind: 'lesson', node: { path: 'history/ancient/india' }, lesson: { slug: 'guptas' }, prev: { slug: 'mauryas' }, next: null })
  })
  it('resolves a book and a chapter on a subject', () => {
    expect(resolvePath(t, ['history', 'books', 'ancient-india'])).toMatchObject({ kind: 'book', book: { slug: 'ancient-india' } })
    expect(resolvePath(t, ['history', 'books', 'ancient-india', 'guptas'])).toMatchObject({
      kind: 'chapter',
      chapter: { number: 2 },
      prev: { slug: 'mauryas' },
      next: null,
    })
  })
  it('returns null for anything else', () => {
    expect(resolvePath(t, ['history', 'nope'])).toBeNull()
    expect(resolvePath(t, ['history', 'ancient', 'books', 'x'])).toBeNull()
    expect(resolvePath(t, ['history', 'books', 'missing'])).toBeNull()
  })
})

describe('flattenLessons', () => {
  it('lists lessons in reading order: depth first, by position', () => {
    expect(flattenLessons(buildTree(input)).map((l) => l.slug)).toEqual(['mauryas', 'guptas', 'rome', 'delhi'])
  })
})

describe('chapters tagged to a node', () => {
  it('lists the book chapters that cover a node or anything under it, in book and chapter order', () => {
    const t = buildTree(input)
    const tagged = (p: string) => t.byPath.get(p)!.taggedChapters.map((c) => `${c.book.slug}/${c.chapter.slug}`)
    expect(tagged('history/ancient/india')).toEqual(['ancient-india/mauryas', 'ancient-india/guptas'])
    expect(tagged('history/ancient')).toEqual(['ancient-india/mauryas', 'ancient-india/guptas'])
    expect(tagged('history/medieval')).toEqual([])
  })

  it('links each tagged chapter to its book on the subject', () => {
    const c = buildTree(input).byPath.get('history/ancient/india')!.taggedChapters[0]
    expect(c.subjectPath).toBe('history')
    expect(c.chapter.read).toBe(true)
  })
})
