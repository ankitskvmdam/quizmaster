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
  categoriesFile,
  sectionsFile,
  lessonFrontmatter,
  questionsFile,
  subjectFile,
  testFile,
  topicFile,
  type QuestionShape,
} from './schema'

export type Issue = { file: string; message: string }

export class ContentError extends Error {
  constructor(public issues: Issue[]) {
    super(`${issues.length} problem${issues.length === 1 ? '' : 's'} in content:\n` +
      issues.map((i) => `  ${i.file}: ${i.message}`).join('\n'))
    this.name = 'ContentError'
  }
}

export type SubjectItem = { slug: string; name: string; description: string; position: number; published: boolean }
/** sectionSlug is left out (undefined) when the subject has no sections.yaml. */
export type TopicItem = {
  subjectSlug: string
  slug: string
  name: string
  description: string
  position: number
  sectionSlug?: string
}
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
  topicSlug: string
  slug: string
  title: string
  position: number
  published: boolean
  body_md: string
}
export type QuestionItem = {
  slug: string
  topicRef: string | null // "<subject>/<topic>" for topic questions
  caMonthRef: string | null // "<subject>/<section>/<YYYY-MM>" for current-affairs questions
  categorySlug: string | null
  stem_md: string
  options: { key: string; text_md: string }[]
  correctKey: string
  explanation_md: string
  difficulty: 'easy' | 'medium' | 'hard'
  source: string | null
  tags: string[]
}
export type TestItem = {
  slug: string
  title: string
  kind: 'mock' | 'pyq'
  subjectSlug: string
  year: number | null
  durationSec: number | null
  marksCorrect: number
  marksWrong: number
  published: boolean
  questionSlugs: string[]
  caMonthRef: string | null // set for a month's fixed paper
}
export type ContentBundle = {
  subjects: SubjectItem[]
  sections: SectionItem[]
  categories: CategoryItem[]
  months: MonthItem[]
  topics: TopicItem[]
  lessons: LessonItem[]
  questions: QuestionItem[]
  tests: TestItem[]
}

const TESTS_DIR = 'tests'

/** Reads and validates the whole content folder. Throws ContentError listing every problem found. */
export async function loadContent(root: string): Promise<ContentBundle> {
  const issues: Issue[] = []
  const rel = (p: string) => path.relative(root, p).split(path.sep).join('/')
  const bundle: ContentBundle = { subjects: [], sections: [], categories: [], months: [], topics: [], lessons: [], questions: [], tests: [] }
  const testSlugs = new Set<string>()
  const questionFiles = new Map<string, string>() // slug → file, for duplicate detection

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

  type QuestionRefs = { topicRef: string | null; caMonthRef: string | null; categorySlug: string | null }
  const topicRefs_ = (topicRef: string): QuestionRefs => ({ topicRef, caMonthRef: null, categorySlug: null })

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
          addQuestion(shape, { topicRef: null, caMonthRef: monthRef, categorySlug: category }, rel(qFile))
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
        })
      }
    }
  }

  // Subjects → topics → lessons and question banks
  for (const subjectDir of await dirs(root)) {
    if (subjectDir === TESTS_DIR) continue
    const sPath = path.join(root, subjectDir)
    const sFile = path.join(sPath, 'subject.yaml')
    const subject = check(subjectFile, await readYaml(sFile), rel(sFile))
    if (!subject) continue
    if (subject.slug !== subjectDir) issues.push({ file: rel(sFile), message: `slug "${subject.slug}" must match its folder "${subjectDir}"` })
    bundle.subjects.push(subject)

    // Optional sections.yaml: which folders are current-affairs sections, and where topics belong.
    const secFile = path.join(sPath, 'sections.yaml')
    const sections = (await exists(secFile)) ? (check(sectionsFile, await readYaml(secFile), rel(secFile)) ?? []) : []
    for (const sec of sections) bundle.sections.push({ subjectSlug: subject.slug, ...sec })
    const caSections = new Set(sections.filter((s) => s.kind === 'current_affairs').map((s) => s.slug))
    const topicSections = sections.filter((s) => s.kind === 'topics').map((s) => s.slug)

    for (const topicDir of await dirs(sPath)) {
      if (caSections.has(topicDir)) {
        await loadCurrentAffairs(subject.slug, topicDir, path.join(sPath, topicDir))
        continue
      }
      const tPath = path.join(sPath, topicDir)
      const tFile = path.join(tPath, 'topic.yaml')
      const parsedTopic = check(topicFile, await readYaml(tFile), rel(tFile))
      if (!parsedTopic) continue
      const { section, ...topic } = parsedTopic
      if (topic.slug !== topicDir) issues.push({ file: rel(tFile), message: `slug "${topic.slug}" must match its folder "${topicDir}"` })
      if ((RESERVED_TOPIC_SLUGS as readonly string[]).includes(topic.slug)) {
        issues.push({ file: rel(tFile), message: `"${topic.slug}" is a reserved name and can't be a topic` })
        continue
      }
      let sectionSlug: string | undefined
      if (section) {
        if (!topicSections.includes(section)) issues.push({ file: rel(tFile), message: `section "${section}" is not a topics section in sections.yaml` })
        sectionSlug = section
      } else if (topicSections.length === 1) {
        sectionSlug = topicSections[0]
      } else if (topicSections.length > 1) {
        issues.push({ file: rel(tFile), message: 'this subject has several topic sections; set `section:` in topic.yaml' })
      }
      bundle.topics.push({ subjectSlug: subject.slug, ...topic, ...(sectionSlug ? { sectionSlug } : {}) })

      const lessonSlugs = new Set<string>()
      for (const name of await files(tPath)) {
        const f = path.join(tPath, name)
        if (name.endsWith('.md')) {
          const parsed = matter(await readFile(f, 'utf8'))
          const fm = check(lessonFrontmatter, parsed.data, rel(f))
          if (!fm) continue
          if (lessonSlugs.has(fm.slug)) {
            issues.push({ file: rel(f), message: `${fm.slug}: duplicate lesson slug in topic ${topic.slug}` })
            continue
          }
          lessonSlugs.add(fm.slug)
          bundle.lessons.push({ subjectSlug: subject.slug, topicSlug: topic.slug, ...fm, body_md: parsed.content.replace(/^\s*\n/, '') })
        } else if (name === 'questions.yaml') {
          const qs = check(questionsFile, await readYaml(f), rel(f))
          for (const q of qs ?? []) addQuestion(q, topicRefs_(`${subject.slug}/${topic.slug}`), rel(f))
        }
      }
    }
  }

  // Tests (after all question banks, so references can resolve)
  const topicRefs = new Set(bundle.topics.map((t) => `${t.subjectSlug}/${t.slug}`))
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
    bundle.tests.push({
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
    })
  }

  for (const ref of pendingRefs) {
    if (!questionFiles.has(ref.slug)) {
      issues.push({ file: ref.file, message: `question "${ref.slug}" does not exist` })
    }
  }

  if (issues.length) throw new ContentError(issues)
  return bundle
}
