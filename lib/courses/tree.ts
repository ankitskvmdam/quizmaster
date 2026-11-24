/**
 * A course's syllabus tree, built in memory from flat rows. Pure: no database, so it is unit-tested.
 * Top-level nodes are subjects (History); books sit on subjects; lessons and questions sit on any node.
 */

export type RawTopic = { id: string; parentId: string | null; path: string; slug: string; name: string; description: string; position: number }
export type RawLesson = { id: string; topicId: string; slug: string; title: string; position: number; done: boolean }
/** Live (not retired) questions only. */
export type RawQuestion = { topicId: string | null; chapterId: string | null }
export type RawBook = {
  id: string
  topicId: string
  slug: string
  /** A topic is written for one syllabus topic; its chapters are called sections. */
  kind: 'book' | 'topic'
  title: string
  author: string | null
  edition: string | null
  description: string
  position: number
}
export type RawChapter = { id: string; bookId: string; slug: string; number: number; title: string; read: boolean; coverIds: string[] }

export type TreeInput = { topics: RawTopic[]; lessons: RawLesson[]; questions: RawQuestion[]; books: RawBook[]; chapters: RawChapter[] }

export type BookNode = RawBook & { chapters: RawChapter[]; chaptersRead: number }
/** A book chapter tagged (covers) to a node or something under it; the book lives on the subject at subjectPath. */
export type TaggedChapter = { chapter: RawChapter; book: BookNode; subjectPath: string }

export type TreeNode = RawTopic & {
  depth: number
  children: TreeNode[]
  lessons: RawLesson[]
  books: BookNode[]
  /** Book chapters that cover this node or anything under it, in book then chapter order. */
  taggedChapters: TaggedChapter[]
  /** Rolled up over the node and everything under it. */
  lessonCount: number
  doneCount: number
  questionCount: number
}

export type Tree = {
  roots: TreeNode[]
  byPath: Map<string, TreeNode>
  byId: Map<string, TreeNode>
  /** Nodes above `path`, root first (not including the node itself). */
  ancestors: (path: string) => TreeNode[]
}

const byPosition = <T extends { position: number; slug?: string }>(a: T, b: T) =>
  a.position - b.position || (a.slug ?? '').localeCompare(b.slug ?? '')

export function buildTree(input: TreeInput): Tree {
  const byId = new Map<string, TreeNode>()
  const byPath = new Map<string, TreeNode>()
  for (const t of input.topics) {
    const node: TreeNode = { ...t, depth: t.path.split('/').length, children: [], lessons: [], books: [], taggedChapters: [], lessonCount: 0, doneCount: 0, questionCount: 0 }
    byId.set(t.id, node)
    byPath.set(t.path, node)
  }
  const roots: TreeNode[] = []
  for (const n of byId.values()) {
    const parent = n.parentId ? byId.get(n.parentId) : undefined
    if (parent) parent.children.push(n)
    else roots.push(n)
  }
  for (const l of input.lessons) byId.get(l.topicId)?.lessons.push(l)

  const chaptersByBook = new Map<string, RawChapter[]>()
  for (const c of input.chapters) chaptersByBook.set(c.bookId, [...(chaptersByBook.get(c.bookId) ?? []), c])
  for (const b of input.books) {
    const chapters = [...(chaptersByBook.get(b.id) ?? [])].sort((x, y) => x.number - y.number)
    byId.get(b.topicId)?.books.push({ ...b, chapters, chaptersRead: chapters.filter((c) => c.read).length })
  }

  // Sort everything, then roll counts up from the leaves.
  const sortNode = (n: TreeNode) => {
    n.children.sort(byPosition)
    n.lessons.sort(byPosition)
    n.books.sort(byPosition)
    n.children.forEach(sortNode)
  }
  roots.sort(byPosition)
  roots.forEach(sortNode)

  const chapterCovers = new Map(input.chapters.map((c) => [c.id, c.coverIds]))
  const subtreeIds = (n: TreeNode): Set<string> => new Set([n.id, ...n.children.flatMap((c) => [...subtreeIds(c)])])
  const rollUp = (n: TreeNode) => {
    n.children.forEach(rollUp)
    n.lessonCount = n.lessons.length + n.children.reduce((s, c) => s + c.lessonCount, 0)
    n.doneCount = n.lessons.filter((l) => l.done).length + n.children.reduce((s, c) => s + c.doneCount, 0)
    const ids = subtreeIds(n)
    n.questionCount = input.questions.filter(
      (q) => (q.topicId && ids.has(q.topicId)) || (q.chapterId && (chapterCovers.get(q.chapterId) ?? []).some((t) => ids.has(t))),
    ).length
  }
  roots.forEach(rollUp)

  // Chapters tagged into each subtree (books sit on subjects, so a section finds its material this way).
  const allChapters = roots.flatMap((root) => root.books.flatMap((book) => book.chapters.map((chapter) => ({ chapter, book, subjectPath: root.path }))))
  const tag = (n: TreeNode) => {
    n.children.forEach(tag)
    const ids = subtreeIds(n)
    n.taggedChapters = allChapters.filter((c) => c.chapter.coverIds.some((id) => ids.has(id)))
  }
  roots.forEach(tag)

  const ancestors = (path: string) => {
    const out: TreeNode[] = []
    let cur = byPath.get(path)
    while (cur?.parentId) {
      cur = byId.get(cur.parentId)
      if (cur) out.unshift(cur)
    }
    return out
  }
  return { roots, byPath, byId, ancestors }
}

export type Resolved =
  | { kind: 'node'; node: TreeNode }
  | { kind: 'lesson'; node: TreeNode; lesson: RawLesson; prev: RawLesson | null; next: RawLesson | null }
  | { kind: 'book'; subject: TreeNode; book: BookNode }
  | { kind: 'chapter'; subject: TreeNode; book: BookNode; chapter: RawChapter; prev: RawChapter | null; next: RawChapter | null }

/**
 * What a URL under /courses/<course>/ points at:
 * - "history/books/<book>[/<chapter>]" → a book or chapter on the subject "history";
 * - a node path → that node;
 * - a node path + one more segment → a lesson of that node.
 */
export function resolvePath(tree: Tree, segments: string[]): Resolved | null {
  if (segments.length >= 3 && segments[1] === 'books') {
    const subject = tree.byPath.get(segments[0])
    const book = subject?.books.find((b) => b.slug === segments[2])
    if (!subject || !book || subject.depth !== 1) return null
    if (segments.length === 3) return { kind: 'book', subject, book }
    if (segments.length !== 4) return null
    const i = book.chapters.findIndex((c) => c.slug === segments[3])
    if (i === -1) return null
    return { kind: 'chapter', subject, book, chapter: book.chapters[i], prev: book.chapters[i - 1] ?? null, next: book.chapters[i + 1] ?? null }
  }
  const node = tree.byPath.get(segments.join('/'))
  if (node) return { kind: 'node', node }
  const parent = tree.byPath.get(segments.slice(0, -1).join('/'))
  const i = parent ? parent.lessons.findIndex((l) => l.slug === segments[segments.length - 1]) : -1
  if (!parent || i === -1) return null
  return { kind: 'lesson', node: parent, lesson: parent.lessons[i], prev: parent.lessons[i - 1] ?? null, next: parent.lessons[i + 1] ?? null }
}

/** Every lesson in reading order (depth first; a node's own lessons before its children's), with its node. */
export function flattenLessons(tree: Tree): (RawLesson & { node: TreeNode })[] {
  const out: (RawLesson & { node: TreeNode })[] = []
  const walk = (n: TreeNode) => {
    for (const l of n.lessons) out.push({ ...l, node: n })
    n.children.forEach(walk)
  }
  tree.roots.forEach(walk)
  return out
}
