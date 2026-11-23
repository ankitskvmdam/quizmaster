import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'
import { parse as parseYaml } from 'yaml'
import type { z } from 'zod'
import {
  OPTION_KEYS,
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
export type TopicItem = { subjectSlug: string; slug: string; name: string; description: string; position: number }
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
  topicRef: string // "<subject>/<topic>"
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
}
export type ContentBundle = {
  subjects: SubjectItem[]
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
  const bundle: ContentBundle = { subjects: [], topics: [], lessons: [], questions: [], tests: [] }
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

  function addQuestion(q: QuestionShape, topicRef: string, file: string) {
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
      topicRef,
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

  // Subjects → topics → lessons and question banks
  for (const subjectDir of await dirs(root)) {
    if (subjectDir === TESTS_DIR) continue
    const sPath = path.join(root, subjectDir)
    const sFile = path.join(sPath, 'subject.yaml')
    const subject = check(subjectFile, await readYaml(sFile), rel(sFile))
    if (!subject) continue
    if (subject.slug !== subjectDir) issues.push({ file: rel(sFile), message: `slug "${subject.slug}" must match its folder "${subjectDir}"` })
    bundle.subjects.push(subject)

    for (const topicDir of await dirs(sPath)) {
      const tPath = path.join(sPath, topicDir)
      const tFile = path.join(tPath, 'topic.yaml')
      const topic = check(topicFile, await readYaml(tFile), rel(tFile))
      if (!topic) continue
      if (topic.slug !== topicDir) issues.push({ file: rel(tFile), message: `slug "${topic.slug}" must match its folder "${topicDir}"` })
      bundle.topics.push({ subjectSlug: subject.slug, ...topic })

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
          for (const q of qs ?? []) addQuestion(q, `${subject.slug}/${topic.slug}`, rel(f))
        }
      }
    }
  }

  // Tests (after all question banks, so references can resolve)
  const topicRefs = new Set(bundle.topics.map((t) => `${t.subjectSlug}/${t.slug}`))
  const subjectSlugs = new Set(bundle.subjects.map((s) => s.slug))
  const testSlugs = new Set<string>()
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
        addQuestion(shape, topic, rel(f))
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
