import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'

/**
 * An exam's syllabus, built by tagging every previous-year question. One JSON file per exam
 * (`lib/syllabus/<exam>.json`), read from disk on the server; nothing here is copied into code.
 */

const chapter = z.object({
  name: z.string(),
  questions: z.number(),
  /** In how many of the analysed papers it was asked. */
  papers: z.number(),
  bihar: z.number().optional(),
  current: z.number().optional(),
  learn: z.array(z.string()).default([]),
  note: z.string().optional(),
})

const topic = z.object({
  key: z.string(),
  name: z.string(),
  questions: z.number(),
  chapters: z.array(chapter),
})

const subject = z.object({
  key: z.string(),
  name: z.string(),
  questions: z.number(),
  /** Average questions per paper. */
  perPaper: z.number(),
  topics: z.array(topic),
})

const syllabus = z.object({
  exam: z.string(),
  /** How many past papers were analysed. */
  papers: z.number(),
  questions: z.number(),
  generated: z.string(),
  subjects: z.array(subject),
})

export type Syllabus = z.infer<typeof syllabus>
export type SyllabusChapter = z.infer<typeof chapter>
export type Priority = 'high' | 'medium' | 'low'

export const SYLLABUS_DIR = path.join(process.cwd(), 'lib', 'syllabus')

const EXAM_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const fileFor = (slug: string, dir: string) => path.join(dir, `${slug}.json`)

/** Validates a parsed syllabus file; throws when it is not the expected shape. */
export function parseSyllabus(raw: unknown): Syllabus {
  return syllabus.parse(raw)
}

/** The exam's syllabus, or null when the slug is not a plain exam slug or the exam has no file. */
export async function loadSyllabus(slug: string, dir: string = SYLLABUS_DIR): Promise<Syllabus | null> {
  if (!EXAM_SLUG.test(slug)) return null
  let text: string
  try {
    text = await readFile(fileFor(slug, dir), 'utf8')
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw e
  }
  return parseSyllabus(JSON.parse(text))
}

/** Whether the exam has a syllabus file (without parsing it). */
export async function hasSyllabus(slug: string, dir: string = SYLLABUS_DIR): Promise<boolean> {
  if (!EXAM_SLUG.test(slug)) return false
  try {
    await access(fileFor(slug, dir))
    return true
  } catch {
    return false
  }
}

/** The share (0–1) of the analysed papers a chapter was asked in. */
export function paperShare(c: Pick<SyllabusChapter, 'papers'>, totalPapers: number): number {
  if (totalPapers <= 0) return 0
  return Math.min(1, Math.max(0, c.papers / totalPapers))
}

/** High when asked in at least half the papers, medium from a quarter, low below that. */
export function priorityOf(c: Pick<SyllabusChapter, 'papers'>, totalPapers: number): Priority {
  const share = paperShare(c, totalPapers)
  if (share >= 0.5) return 'high'
  if (share >= 0.25) return 'medium'
  return 'low'
}

/** More than half of the chapter's questions were current affairs. */
export function isMostlyCurrent(c: Pick<SyllabusChapter, 'questions' | 'current'>): boolean {
  return (c.current ?? 0) * 2 > c.questions
}

const count = (n: number) => n.toLocaleString('en-IN')
const plural = (n: number, one: string, many: string) => `${count(n)} ${n === 1 ? one : many}`

/** "Built from 8 previous papers (1,183 questions)". */
export function sourceLine(s: Pick<Syllabus, 'papers' | 'questions'>): string {
  return `Built from ${plural(s.papers, 'previous paper', 'previous papers')} (${plural(s.questions, 'question', 'questions')})`
}

export type ChapterView = SyllabusChapter & { share: number; priority: Priority; mostlyCurrent: boolean }
export type TopicView = { key: string; name: string; questions: number; anchor: string; highCount: number; chapters: ChapterView[] }
export type SubjectView = {
  key: string
  name: string
  questions: number
  perPaper: number
  /** perPaper relative to the heaviest subject (0–1), for the overview bars. */
  weight: number
  anchor: string
  topics: TopicView[]
}
export type SyllabusView = Omit<Syllabus, 'subjects'> & { subjects: SubjectView[] }

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)

/**
 * The syllabus as shown: subjects by questions per paper, topics by questions (empty ones dropped),
 * chapters by how many papers asked them, then by questions. Each chapter carries its share, priority and tags.
 */
export function buildSyllabusView(s: Syllabus): SyllabusView {
  const maxPerPaper = Math.max(0, ...s.subjects.map((x) => x.perPaper))
  const subjects = s.subjects
    .map((sub): SubjectView => ({
      key: sub.key,
      name: sub.name,
      questions: sub.questions,
      perPaper: sub.perPaper,
      weight: maxPerPaper > 0 ? Math.round((sub.perPaper / maxPerPaper) * 1000) / 1000 : 0,
      anchor: `subject-${sub.key}`,
      topics: sub.topics
        .filter((t) => t.chapters.length > 0)
        .map((t): TopicView => {
          const chapters = t.chapters
            .map((c): ChapterView => ({
              ...c,
              share: paperShare(c, s.papers),
              priority: priorityOf(c, s.papers),
              mostlyCurrent: isMostlyCurrent(c),
            }))
            .sort((a, b) => b.papers - a.papers || b.questions - a.questions || byName(a, b))
          return {
            key: t.key,
            name: t.name,
            questions: t.questions,
            anchor: `topic-${sub.key}-${t.key}`,
            highCount: chapters.filter((c) => c.priority === 'high').length,
            chapters,
          }
        })
        .sort((a, b) => b.questions - a.questions || byName(a, b)),
    }))
    .sort((a, b) => b.perPaper - a.perPaper || byName(a, b))
  return { exam: s.exam, papers: s.papers, questions: s.questions, generated: s.generated, subjects }
}
