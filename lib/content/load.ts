import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'
import { parse as parseYaml } from 'yaml'
import type { z } from 'zod'
import { isMonthKey, formatMonth } from '@/lib/periods'
import {
  OPTION_KEYS,
  RESERVED_TOPIC_SLUGS,
  caNotesFile,
  caQuestionsFile,
  caTestFile,
  bookFile,
  chapterFrontmatter,
  categoriesFile,
  sectionsFile,
  lessonFrontmatter,
  questionsFile,
  subjectFile,
  testFile,
  topicFile,
  type QuestionShape,
} from './schema'
import { applyTranslations, hasGistShape, TRANSLATIONS_DIR, type Source } from './translate'

export type Issue = { file: string; message: string }

export class ContentError extends Error {
  constructor(public issues: Issue[]) {
    super(`${issues.length} problem${issues.length === 1 ? '' : 's'} in content:\n` +
      issues.map((i) => `  ${i.file}: ${i.message}`).join('\n'))
    this.name = 'ContentError'
  }
}

/** Hindi twins (*_hi) come from translations/hi/ and are absent when that text isn't translated. */
type Hi<K extends string> = { [P in K]?: string | null }
export type SubjectItem = { slug: string; name: string; description: string; position: number; published: boolean } & Hi<'name_hi' | 'description_hi'>
/** sectionSlug is left out (undefined) when the subject has no sections.yaml. */
export type TopicItem = {
  subjectSlug: string
  slug: string
  name: string
  description: string
  position: number
  path: string // "history/ancient/india"
  parentPath: string | null
  sectionSlug?: string
} & Hi<'name_hi' | 'description_hi'>
export type BookItem = {
  subjectSlug: string
  topicPath: string // the subject node the book sits on, e.g. "history"
  slug: string
  title: string
  author: string | null
  edition: string | null
  description: string
  position: number
  published: boolean
} & Hi<'title_hi' | 'description_hi'>
export type ChapterItem = {
  bookRef: string // "<course>/<subject path>/<book>"
  slug: string
  number: number
  title: string
  gist_md: string
  position: number
  covers: string[] // full tree paths
} & Hi<'title_hi' | 'gist_md_hi'>
export type SectionItem = { subjectSlug: string; slug: string; name: string; kind: 'topics' | 'current_affairs'; position: number }
export type CategoryItem = { slug: string; name: string; position: number }
export type CaNoteItem = {
  slug: string
  categorySlug: string
  happenedOn: string | null
  body_md: string
  angle_md: string | null
  position: number
}
export type MonthItem = { subjectSlug: string; sectionSlug: string; month: string; notes: CaNoteItem[] }
export type LessonItem = {
  subjectSlug: string
  topicPath: string
  slug: string
  title: string
  position: number
  published: boolean
  body_md: string
} & Hi<'title_hi' | 'body_md_hi'>
export type QuestionItem = {
  slug: string
  topicRef: string | null // "<subject>/<topic>" for topic questions
  caMonthRef: string | null // "<subject>/<section>/<YYYY-MM>" for current-affairs questions
  categorySlug: string | null
  chapterRef: string | null // "<course>/<subject path>/<book>/<chapter>" for chapter quiz questions
  stem_md: string
  options: { key: string; text_md: string }[]
  correctKey: string
  explanation_md: string
  difficulty: 'easy' | 'medium' | 'hard'
  source: string | null
  tags: string[]
  stem_md_hi?: string | null
  options_hi?: { key: string; text_md: string }[] | null
  explanation_md_hi?: string | null
}
export type TestItem = {
  slug: string
  title: string
  kind: 'mock' | 'pyq' | 'chapter'
  subjectSlug: string
  year: number | null
  durationSec: number | null
  marksCorrect: number
  marksWrong: number
  published: boolean
  questionSlugs: string[]
  caMonthRef: string | null // set for a month's fixed paper
  chapterRef: string | null // set for a chapter's quiz
} & Hi<'title_hi'>
export type ContentBundle = {
  subjects: SubjectItem[]
  sections: SectionItem[]
  categories: CategoryItem[]
  months: MonthItem[]
  topics: TopicItem[]
  books: BookItem[]
  chapters: ChapterItem[]
  lessons: LessonItem[]
  questions: QuestionItem[]
  tests: TestItem[]
}

/**
 * A plain line right under a list item, with no blank line between, is folded into that item by Markdown ("lazy
 * continuation"): "2. Two.\nWhich of the above…" renders as one list item. Returns that line, or null.
 */
export function foldedIntoList(md: string): string | null {
  const lines = md.split('\n')
  const isItem = (l: string) => /^\s*(\d+[.)]|[-*+])\s/.test(l)
  for (let i = 1; i < lines.length; i++) {
    const cur = lines[i]
    if (isItem(lines[i - 1]) && cur.trim() && !isItem(cur) && !/^\s/.test(cur) && !cur.trim().startsWith('|')) return cur.trim()
  }
  return null
}

const TESTS_DIR = 'tests'
const BOOKS_DIR = 'books'

/** Reads and validates the whole content folder. Throws ContentError listing every problem found. */
export async function loadContent(root: string): Promise<ContentBundle> {
  const issues: Issue[] = []
  const rel = (p: string) => path.relative(root, p).split(path.sep).join('/')
  const bundle: ContentBundle = {
    subjects: [],
    sections: [],
    categories: [],
    months: [],
    topics: [],
    books: [],
    chapters: [],
    lessons: [],
    questions: [],
    tests: [],
  }
  const testSlugs = new Set<string>()
  const pendingCovers: { file: string; slug: string; covers: string[]; subjectSlug: string }[] = []
  const questionFiles = new Map<string, string>() // slug → file, for duplicate detection
  const sources = new Map<string, Source>() // English file → its item, for translations

  function check<T>(schema: z.ZodType<T>, data: unknown, file: string): T | null {
    const r = schema.safeParse(data)
    if (r.success) return r.data
    for (const i of r.error.issues) {
      issues.push({ file, message: `${i.path.length ? i.path.join('.') + ': ' : ''}${i.message}` })
    }
    return null
  }

  async function readYaml(file: string): Promise<unknown> {
    try {
      return parseYaml(await readFile(file, 'utf8'))
    } catch (e) {
      issues.push({ file: rel(file), message: `cannot read YAML: ${(e as Error).message}` })
      return undefined
    }
  }

  type QuestionRefs = { topicRef: string | null; caMonthRef: string | null; categorySlug: string | null; chapterRef: string | null }
  const topicRefs_ = (topicRef: string): QuestionRefs => ({ topicRef, caMonthRef: null, categorySlug: null, chapterRef: null })

  function addQuestion(q: QuestionShape, refs: QuestionRefs, file: string) {
    const keys = Object.keys(q.options)
    const expected = OPTION_KEYS.slice(0, keys.length)
    let ok = true
    if (keys.length < 2 || keys.length > 6 || keys.some((k, i) => k !== expected[i])) {
      issues.push({ file, message: `${q.slug}: options must be A, B, … in order, between 2 and 6 of them` })
      ok = false
    }
    if (!keys.includes(q.answer)) {
      issues.push({ file, message: `${q.slug}: answer "${q.answer}" is not one of the options (${keys.join(', ')})` })
      ok = false
    }
    const folded = foldedIntoList(q.stem)
    if (folded) {
      issues.push({ file, message: `${q.slug}: stem: put a blank line between the last list item and "${folded}"` })
      ok = false
    }
    const seen = questionFiles.get(q.slug)
    if (seen) {
      issues.push({ file, message: `${q.slug}: duplicate question slug (also in ${seen})` })
      return
    }
    questionFiles.set(q.slug, file)
    if (!ok) return
    bundle.questions.push({
      slug: q.slug,
      ...refs,
      stem_md: q.stem,
      options: keys.map((key) => ({ key, text_md: q.options[key] })),
      correctKey: q.answer,
      explanation_md: q.explanation,
      difficulty: q.difficulty,
      source: q.source ?? null,
      tags: q.tags,
    })
  }

  const dirs = (p: string) =>
    readdir(p, { withFileTypes: true }).then((es) => es.filter((e) => e.isDirectory()).map((e) => e.name).sort())
  const files = (p: string) =>
    readdir(p, { withFileTypes: true }).then((es) => es.filter((e) => e.isFile()).map((e) => e.name).sort())

  const exists = (p: string) =>
    readFile(p).then(
      () => true,
      () => false,
    )

  /** A current-affairs section folder: categories.yaml plus one folder per month (YYYY-MM). */
  async function loadCurrentAffairs(subjectSlug: string, sectionSlug: string, dir: string) {
    const catFile = path.join(dir, 'categories.yaml')
    const cats = check(categoriesFile, await readYaml(catFile), rel(catFile)) ?? []
    const catSlugs = new Set(cats.map((c) => c.slug))
    cats.forEach((c, i) => {
      if (!bundle.categories.some((x) => x.slug === c.slug)) bundle.categories.push({ ...c, position: i + 1 })
    })

    for (const month of await dirs(dir)) {
      const mPath = path.join(dir, month)
      if (!isMonthKey(month)) {
        issues.push({ file: rel(mPath), message: `"${month}" is not a month folder; name it like 2026-01` })
        continue
      }
      const monthRef = `${subjectSlug}/${sectionSlug}/${month}`

      // Notes
      const nFile = path.join(mPath, 'notes.yaml')
      const notes: CaNoteItem[] = []
      if (!(await exists(nFile))) {
        issues.push({ file: rel(mPath), message: 'a month needs a notes.yaml' })
      } else {
        const seen = new Set<string>()
        ;(check(caNotesFile, await readYaml(nFile), rel(nFile)) ?? []).forEach((n, i) => {
          if (seen.has(n.slug)) return issues.push({ file: rel(nFile), message: `${n.slug}: duplicate note slug in ${month}` })
          seen.add(n.slug)
          if (!catSlugs.has(n.category)) return issues.push({ file: rel(nFile), message: `${n.slug}: unknown category "${n.category}"` })
          if (n.date && n.date.slice(0, 7) !== month) {
            return issues.push({ file: rel(nFile), message: `${n.slug}: date ${n.date} is outside ${formatMonth(month)}` })
          }
          notes.push({
            slug: n.slug,
            categorySlug: n.category,
            happenedOn: n.date ?? null,
            body_md: n.note,
            angle_md: n.angle ?? null,
            position: i + 1,
          })
        })
      }
      bundle.months.push({ subjectSlug, sectionSlug, month, notes })

      // Questions
      const qFile = path.join(mPath, 'questions.yaml')
      const monthQuestions = new Set<string>()
      if (await exists(qFile)) {
        for (const q of check(caQuestionsFile, await readYaml(qFile), rel(qFile)) ?? []) {
          const { category, ...shape } = q
          if (!catSlugs.has(category)) {
            issues.push({ file: rel(qFile), message: `${q.slug}: unknown category "${category}"` })
            continue
          }
          monthQuestions.add(q.slug)
          addQuestion(shape, { topicRef: null, caMonthRef: monthRef, categorySlug: category, chapterRef: null }, rel(qFile))
        }
      }

      // The month's fixed paper
      const tFile = path.join(mPath, 'test.yaml')
      if (await exists(tFile)) {
        const t = check(caTestFile, await readYaml(tFile), rel(tFile))
        if (!t) continue
        const outside = t.questions.filter((s) => !monthQuestions.has(s))
        for (const s of outside) issues.push({ file: rel(tFile), message: `question "${s}" is not in this month` })
        if (new Set(t.questions).size !== t.questions.length) {
          issues.push({ file: rel(tFile), message: 'the paper lists the same question more than once' })
        }
        const slug = `ca-${sectionSlug}-${month}`
        testSlugs.add(slug)
        bundle.tests.push({
          slug,
          title: t.title,
          kind: 'mock',
          subjectSlug,
          year: null,
          durationSec: Math.round(t.duration_min * 60),
          marksCorrect: 1,
          marksWrong: -0.33,
          published: true,
          questionSlugs: t.questions,
          caMonthRef: monthRef,
          chapterRef: null,
        })
      }
    }
  }

  // Subjects → topics → lessons and question banks
  for (const subjectDir of await dirs(root)) {
    if (subjectDir === TESTS_DIR || subjectDir === TRANSLATIONS_DIR) continue
    const sPath = path.join(root, subjectDir)
    // A course is described by course.yaml (subject.yaml is the older name and still works).
    const sFile = (await exists(path.join(sPath, 'course.yaml'))) ? path.join(sPath, 'course.yaml') : path.join(sPath, 'subject.yaml')
    const subject = check(subjectFile, await readYaml(sFile), rel(sFile))
    if (!subject) continue
    if (subject.slug !== subjectDir) issues.push({ file: rel(sFile), message: `slug "${subject.slug}" must match its folder "${subjectDir}"` })
    bundle.subjects.push(subject)
    sources.set(rel(sFile), { kind: 'course', item: subject })

    // Optional sections.yaml: which folders are current-affairs sections, and where topics belong.
    const secFile = path.join(sPath, 'sections.yaml')
    const sections = (await exists(secFile)) ? (check(sectionsFile, await readYaml(secFile), rel(secFile)) ?? []) : []
    for (const sec of sections) bundle.sections.push({ subjectSlug: subject.slug, ...sec })
    const caSections = new Set(sections.filter((s) => s.kind === 'current_affairs').map((s) => s.slug))
    const topicSections = sections.filter((s) => s.kind === 'topics').map((s) => s.slug)

    /** One tree node (a folder with topic.yaml): its lessons, questions, books (subjects only) and child nodes. */
    async function loadNode(tPath: string, parentPath: string | null) {
      const folder = path.basename(tPath)
      const tFile = path.join(tPath, 'topic.yaml')
      const parsedTopic = check(topicFile, await readYaml(tFile), rel(tFile))
      if (!parsedTopic) return
      const { section, ...topic } = parsedTopic
      if (topic.slug !== folder) issues.push({ file: rel(tFile), message: `slug "${topic.slug}" must match its folder "${folder}"` })
      if ((RESERVED_TOPIC_SLUGS as readonly string[]).includes(topic.slug)) {
        issues.push({ file: rel(tFile), message: `"${topic.slug}" is a reserved name and can't be a topic` })
        return
      }
      const nodePath = parentPath ? `${parentPath}/${topic.slug}` : topic.slug
      let sectionSlug: string | undefined
      if (parentPath === null) {
        if (section) {
          if (!topicSections.includes(section)) issues.push({ file: rel(tFile), message: `section "${section}" is not a topics section in sections.yaml` })
          sectionSlug = section
        } else if (topicSections.length === 1) {
          sectionSlug = topicSections[0]
        } else if (topicSections.length > 1) {
          issues.push({ file: rel(tFile), message: 'this subject has several topic sections; set `section:` in topic.yaml' })
        }
      }
      const topicItem: TopicItem = { subjectSlug: subject!.slug, ...topic, path: nodePath, parentPath, ...(sectionSlug ? { sectionSlug } : {}) }
      bundle.topics.push(topicItem)
      sources.set(rel(tFile), { kind: 'topic', item: topicItem })

      const childDirs = await dirs(tPath)
      const lessonSlugs = new Set<string>()
      for (const name of await files(tPath)) {
        const f = path.join(tPath, name)
        if (name.endsWith('.md')) {
          const parsed = matter(await readFile(f, 'utf8'))
          const fm = check(lessonFrontmatter, parsed.data, rel(f))
          if (!fm) continue
          if (lessonSlugs.has(fm.slug)) {
            issues.push({ file: rel(f), message: `${fm.slug}: duplicate lesson slug in ${nodePath}` })
            continue
          }
          if (childDirs.includes(fm.slug)) {
            issues.push({ file: rel(f), message: `${fm.slug}: lesson slug clashes with the child folder "${fm.slug}"` })
            continue
          }
          lessonSlugs.add(fm.slug)
          const lessonItem: LessonItem = { subjectSlug: subject!.slug, topicPath: nodePath, ...fm, body_md: parsed.content.replace(/^\s*\n/, '') }
          bundle.lessons.push(lessonItem)
          sources.set(rel(f), { kind: 'lesson', item: lessonItem })
        } else if (name === 'questions.yaml') {
          const qs = check(questionsFile, await readYaml(f), rel(f))
          for (const q of qs ?? []) addQuestion(q, topicRefs_(`${subject!.slug}/${nodePath}`), rel(f))
          sources.set(rel(f), { kind: 'questions' })
        }
      }

      for (const child of childDirs) {
        const cPath = path.join(tPath, child)
        if (child === BOOKS_DIR) {
          if (parentPath === null) await loadBooks(nodePath, cPath)
          else issues.push({ file: rel(cPath), message: `"${BOOKS_DIR}" is reserved for a subject's books; it can't be nested deeper` })
          continue
        }
        await loadNode(cPath, nodePath)
      }
    }

    /** books/<book>/book.yaml + NN-<chapter>.md (+ NN-<chapter>.quiz.yaml) on a subject node. */
    async function loadBooks(subjectPath: string, booksDir: string) {
      for (const bookSlug of await dirs(booksDir)) {
        const bDir = path.join(booksDir, bookSlug)
        const bFile = path.join(bDir, 'book.yaml')
        const book = check(bookFile, await readYaml(bFile), rel(bFile))
        if (!book) continue
        const bookItem: BookItem = {
          subjectSlug: subject!.slug,
          topicPath: subjectPath,
          slug: bookSlug,
          title: book.title,
          author: book.author ?? null,
          edition: book.edition ?? null,
          description: book.description,
          position: book.position,
          published: book.published,
        }
        bundle.books.push(bookItem)
        sources.set(rel(bFile), { kind: 'book', item: bookItem })
        const bookRef = `${subject!.slug}/${subjectPath}/${bookSlug}`
        const numbers = new Map<number, string>()
        const names = await files(bDir)
        for (const name of names.filter((n) => n.endsWith('.md'))) {
          const f = path.join(bDir, name)
          const parsed = matter(await readFile(f, 'utf8'))
          const fm = check(chapterFrontmatter, parsed.data, rel(f))
          if (!fm) continue
          const body = parsed.content.replace(/^\s*\n/, '')
          if (!hasGistShape(body)) {
            issues.push({ file: rel(f), message: `${fm.slug}: a chapter needs a "## Gist" section and a "## Key facts" section with at least one bullet` })
            continue
          }
          const clash = numbers.get(fm.number)
          if (clash) {
            issues.push({ file: rel(f), message: `${fm.slug}: chapter number ${fm.number} is already used by "${clash}"` })
            continue
          }
          numbers.set(fm.number, fm.slug)
          const covers = fm.covers.map((c) => `${subjectPath}/${c}`.replace(/\/$/, ''))
          pendingCovers.push({ file: rel(f), slug: fm.slug, covers, subjectSlug: subject!.slug })
          const chapterItem: ChapterItem = { bookRef, slug: fm.slug, number: fm.number, title: fm.title, gist_md: body, position: fm.number, covers }
          bundle.chapters.push(chapterItem)
          const chapterSource: Source = { kind: 'chapter', item: chapterItem, quiz: null }
          sources.set(rel(f), chapterSource)

          const quizName = name.replace(/\.md$/, '.quiz.yaml')
          if (names.includes(quizName)) {
            const qf = path.join(bDir, quizName)
            const chapterRef = `${bookRef}/${fm.slug}`
            const qs = check(questionsFile, await readYaml(qf), rel(qf)) ?? []
            for (const q of qs) addQuestion(q, { topicRef: null, caMonthRef: null, categorySlug: null, chapterRef }, rel(qf))
            sources.set(rel(qf), { kind: 'questions' })
            if (qs.length) {
              const slug = `book-${subjectPath.replace(/\//g, '-')}-${bookSlug}-${fm.slug}`
              testSlugs.add(slug)
              const quiz: TestItem = {
                slug,
                title: `${fm.title} quiz`,
                kind: 'chapter',
                subjectSlug: subject!.slug,
                year: null,
                durationSec: null,
                marksCorrect: 1,
                marksWrong: 0,
                published: book.published,
                questionSlugs: qs.map((q) => q.slug),
                caMonthRef: null,
                chapterRef,
              }
              bundle.tests.push(quiz)
              chapterSource.quiz = quiz
            }
          }
        }
      }
    }

    for (const topicDir of await dirs(sPath)) {
      if (caSections.has(topicDir)) {
        await loadCurrentAffairs(subject.slug, topicDir, path.join(sPath, topicDir))
        continue
      }
      await loadNode(path.join(sPath, topicDir), null)
    }
  }

  // Chapter tags must point at nodes of the same course's tree.
  const treePaths = new Set(bundle.topics.map((t) => `${t.subjectSlug}/${t.path}`))
  for (const c of pendingCovers) {
    for (const p of c.covers) {
      if (!treePaths.has(`${c.subjectSlug}/${p}`)) issues.push({ file: c.file, message: `${c.slug}: covers "${p}", which is not in the syllabus tree` })
    }
  }

  // Tests (after all question banks, so references can resolve)
  const topicRefs = new Set(bundle.topics.map((t) => `${t.subjectSlug}/${t.path}`))
  const subjectSlugs = new Set(bundle.subjects.map((s) => s.slug))
  const testsPath = path.join(root, TESTS_DIR)
  const testNames = await files(testsPath).catch(() => [] as string[])
  const pendingRefs: { file: string; slug: string }[] = []

  for (const name of testNames.filter((n) => n.endsWith('.yaml'))) {
    const f = path.join(testsPath, name)
    const t = check(testFile, await readYaml(f), rel(f))
    if (!t) continue
    if (testSlugs.has(t.slug)) {
      issues.push({ file: rel(f), message: `${t.slug}: duplicate test slug` })
      continue
    }
    testSlugs.add(t.slug)
    if (!subjectSlugs.has(t.subject)) issues.push({ file: rel(f), message: `subject "${t.subject}" does not exist` })

    const questionSlugs: string[] = []
    for (const q of t.questions) {
      if (typeof q === 'string') {
        questionSlugs.push(q)
        pendingRefs.push({ file: rel(f), slug: q })
      } else {
        if (!topicRefs.has(q.topic)) {
          issues.push({ file: rel(f), message: `${q.slug}: topic "${q.topic}" does not exist` })
          continue
        }
        const { topic, ...shape } = q
        addQuestion(shape, topicRefs_(topic), rel(f))
        questionSlugs.push(q.slug)
      }
    }
    if (new Set(questionSlugs).size !== questionSlugs.length) {
      issues.push({ file: rel(f), message: `${t.slug}: lists the same question more than once` })
    }
    const testItem: TestItem = {
      slug: t.slug,
      title: t.title,
      kind: t.kind,
      subjectSlug: t.subject,
      year: t.year ?? null,
      durationSec: t.duration_min ? Math.round(t.duration_min * 60) : null,
      marksCorrect: t.marks.correct,
      marksWrong: t.marks.wrong,
      published: t.published,
      questionSlugs,
      caMonthRef: null,
      chapterRef: null,
    }
    bundle.tests.push(testItem)
    sources.set(rel(f), { kind: 'test', item: testItem })
  }

  for (const ref of pendingRefs) {
    if (!questionFiles.has(ref.slug)) {
      issues.push({ file: ref.file, message: `question "${ref.slug}" does not exist` })
    }
  }

  // Hindi text from translations/hi/, checked against the English it mirrors.
  await applyTranslations(root, bundle, sources, questionFiles, issues)

  if (issues.length) throw new ContentError(issues)
  return bundle
}
