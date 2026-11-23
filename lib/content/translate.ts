import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'
import { parse as parseYaml } from 'yaml'
import type { z } from 'zod'
import { bookFile, chapterFrontmatter, lessonFrontmatter, questionsFile, subjectFile, testFile, topicFile, type QuestionShape } from './schema'
import type { BookItem, ChapterItem, ContentBundle, Issue, LessonItem, SubjectItem, TestItem, TopicItem } from './load'

/** Where each English item came from, keyed by its file path relative to the content root. */
export type Source =
  | { kind: 'course'; item: SubjectItem }
  | { kind: 'topic'; item: TopicItem }
  | { kind: 'lesson'; item: LessonItem }
  | { kind: 'book'; item: BookItem }
  | { kind: 'chapter'; item: ChapterItem; quiz: TestItem | null }
  | { kind: 'questions' }
  | { kind: 'test'; item: TestItem }

export const TRANSLATIONS_DIR = 'translations'
export const HINDI = 'hi'
/** What a chapter quiz is called in Hindi: "<chapter title> प्रश्नोत्तरी". */
export const QUIZ_SUFFIX_HI = 'प्रश्नोत्तरी'

export const hasGistShape = (body: string) =>
  /^## Gist\s*$/m.test(body) && /^## Key facts\s*$/m.test(body) && /^## Key facts[\s\S]*^\s*- \S/m.test(body)

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  const out: string[] = []
  for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...(await walk(p)))
    else if (e.isFile()) out.push(p)
  }
  return out
}

/**
 * Reads <root>/translations/hi/, which mirrors the English files, and attaches the Hindi text to the English items as
 * *_hi fields. A translation may cover any subset of files and questions; everything it doesn't cover stays
 * English-only. Anything that is a fact rather than text (slugs, positions, answers, option letters, difficulty,
 * sources, tags, chapter numbers and tags) must match the English exactly, so a translation can't change an answer.
 */
export async function applyTranslations(
  root: string,
  bundle: ContentBundle,
  sources: Map<string, Source>,
  questionFiles: Map<string, string>,
  issues: Issue[],
): Promise<void> {
  const hiRoot = path.join(root, TRANSLATIONS_DIR, HINDI)
  const relRoot = (p: string) => path.relative(root, p).split(path.sep).join('/')
  const questions = new Map(bundle.questions.map((q) => [q.slug, q]))

  for (const f of await walk(hiRoot)) {
    const file = relRoot(f)
    const key = path.relative(hiRoot, f).split(path.sep).join('/')
    const src = sources.get(key)
    if (!src) {
      issues.push({ file, message: `has no English original (expected content at ${key})` })
      continue
    }
    const raw = await readFile(f, 'utf8')

    function parse<T>(schema: z.ZodType<T>, data: unknown): T | null {
      const r = schema.safeParse(data)
      if (r.success) return r.data
      for (const i of r.error.issues) issues.push({ file, message: `${i.path.length ? i.path.join('.') + ': ' : ''}${i.message}` })
      return null
    }
    function yaml(): unknown {
      try {
        return parseYaml(raw)
      } catch (e) {
        issues.push({ file, message: `cannot read YAML: ${(e as Error).message}` })
        return undefined
      }
    }
    /** Fields that must be identical to the English; returns false (and reports) on the first difference. */
    function same(label: string, pairs: [string, unknown, unknown][]): boolean {
      for (const [field, hi, en] of pairs) {
        if (JSON.stringify(hi ?? null) !== JSON.stringify(en ?? null)) {
          issues.push({ file, message: `${label}${field} must match the English (${JSON.stringify(en ?? null)})` })
          return false
        }
      }
      return true
    }
    function question(q: QuestionShape) {
      const en = questions.get(q.slug)
      if (!en || questionFiles.get(q.slug) !== key) {
        issues.push({ file, message: `${q.slug}: is not a question in the English ${key}` })
        return
      }
      const keys = Object.keys(q.options)
      const ok = same(`${q.slug}: `, [
        ['answer', q.answer, en.correctKey],
        ['difficulty', q.difficulty, en.difficulty],
        ['option letters', keys, en.options.map((o) => o.key)],
        ['source', q.source, en.source],
        ['tags', q.tags, en.tags],
      ])
      if (!ok) return
      en.stem_md_hi = q.stem
      en.options_hi = keys.map((k) => ({ key: k, text_md: q.options[k] }))
      en.explanation_md_hi = q.explanation
    }

    switch (src.kind) {
      case 'course': {
        const c = parse(subjectFile, yaml())
        if (!c || !same('', [['slug', c.slug, src.item.slug], ['position', c.position, src.item.position], ['published', c.published, src.item.published]])) break
        src.item.name_hi = c.name
        src.item.description_hi = c.description || null
        break
      }
      case 'topic': {
        const t = parse(topicFile, yaml())
        if (!t || !same('', [['slug', t.slug, src.item.slug], ['position', t.position, src.item.position]])) break
        src.item.name_hi = t.name
        src.item.description_hi = t.description || null
        break
      }
      case 'lesson': {
        const parsed = matter(raw)
        const fm = parse(lessonFrontmatter, parsed.data)
        if (!fm || !same('', [['slug', fm.slug, src.item.slug], ['position', fm.position, src.item.position], ['published', fm.published, src.item.published]])) break
        src.item.title_hi = fm.title
        src.item.body_md_hi = parsed.content.replace(/^\s*\n/, '')
        break
      }
      case 'book': {
        const b = parse(bookFile, yaml())
        if (!b || !same('', [['position', b.position, src.item.position], ['published', b.published, src.item.published]])) break
        src.item.title_hi = b.title
        src.item.description_hi = b.description || null
        break
      }
      case 'chapter': {
        const parsed = matter(raw)
        const fm = parse(chapterFrontmatter, parsed.data)
        if (!fm) break
        const subjectPath = src.item.bookRef.split('/')[1] // bookRef is "<course>/<subject>/<book>"
        const covers = fm.covers.map((c) => `${subjectPath}/${c}`.replace(/\/$/, ''))
        if (!same('', [['slug', fm.slug, src.item.slug], ['number', fm.number, src.item.number], ['covers', covers, src.item.covers]])) break
        const body = parsed.content.replace(/^\s*\n/, '')
        if (!hasGistShape(body)) {
          issues.push({ file, message: `${fm.slug}: a chapter needs a "## Gist" section and a "## Key facts" section with at least one bullet` })
          break
        }
        src.item.title_hi = fm.title
        src.item.gist_md_hi = body
        if (src.quiz) src.quiz.title_hi = `${fm.title} ${QUIZ_SUFFIX_HI}`
        break
      }
      case 'questions': {
        for (const q of parse(questionsFile, yaml()) ?? []) question(q)
        break
      }
      case 'test': {
        const t = parse(testFile, yaml())
        if (!t || !same('', [['slug', t.slug, src.item.slug]])) break
        src.item.title_hi = t.title
        for (const q of t.questions) {
          if (typeof q === 'string') continue
          const { topic: _topic, ...shape } = q
          question(shape)
        }
        break
      }
    }
  }
}
