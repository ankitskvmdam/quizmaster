import { z } from 'zod'

/** Text in YAML may come back as a number ("A: 80"); content always treats it as text. */
const text = z.union([z.string(), z.number()]).transform(String)
const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be lower-case letters, digits and single hyphens')

export const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E', 'F'] as const

export const subjectFile = z
  .object({
    slug,
    name: z.string().min(1),
    description: z.string().default(''),
    position: z.number().int(),
    published: z.boolean().default(true),
  })
  .strict()

export const topicFile = z
  .object({
    slug,
    name: z.string().min(1),
    description: z.string().default(''),
    position: z.number().int(),
    section: slug.optional(),
  })
  .strict()

export const lessonFrontmatter = z
  .object({
    slug,
    title: z.string().min(1),
    position: z.number().int(),
    published: z.boolean().default(true),
  })
  .strict()

export const questionShape = z
  .object({
    slug,
    stem: text.pipe(z.string().min(1)),
    options: z.record(z.string(), text),
    answer: text,
    explanation: text.pipe(z.string().min(1)),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    source: z.string().optional(),
    tags: z.array(z.string()).default([]),
  })
  .strict()

export const questionsFile = z.array(questionShape)

const inlineQuestion = questionShape.extend({
  topic: z.string().regex(/^[a-z0-9-]+(\/[a-z0-9-]+)+$/, 'must be "<course>/<path in the tree>"'),
})

export const testFile = z
  .object({
    slug,
    title: z.string().min(1),
    kind: z.enum(['mock', 'pyq']),
    subject: slug,
    year: z.number().int().optional(),
    duration_min: z.number().positive().optional(),
    marks: z
      .object({ correct: z.number().positive(), wrong: z.number().max(0, 'must be 0 or negative') })
      .strict(),
    published: z.boolean().default(true),
    questions: z.array(z.union([slug, inlineQuestion])).min(1),
  })
  .strict()
  .refine((t) => t.kind !== 'pyq' || t.year !== undefined, { message: 'a pyq test needs a year', path: ['year'] })

export type QuestionShape = z.infer<typeof questionShape>

// ---------------------------------------------------------------------------
// Sections and monthly current affairs
// ---------------------------------------------------------------------------
export const RESERVED_TOPIC_SLUGS = ['current-affairs', 'books'] as const

export const sectionsFile = z.array(
  z
    .object({
      slug,
      name: z.string().min(1),
      kind: z.enum(['topics', 'current_affairs']),
      position: z.number().int(),
    })
    .strict(),
)

export const categoriesFile = z.array(z.object({ slug, name: z.string().min(1) }).strict()).min(1)

const isoDate = z
  .union([z.string(), z.date()])
  .transform((d) => (d instanceof Date ? d.toISOString().slice(0, 10) : d))
  .pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be a date like 2026-01-14'))

export const caNotesFile = z.array(
  z
    .object({
      slug,
      category: slug,
      date: isoDate.optional(),
      note: text.pipe(z.string().min(1)),
      angle: text.optional(),
    })
    .strict(),
)

export const caQuestionsFile = z.array(questionShape.extend({ category: slug }))

export const caTestFile = z
  .object({
    title: z.string().min(1),
    duration_min: z.number().positive(),
    questions: z.array(slug).min(1),
  })
  .strict()


// ---------------------------------------------------------------------------
// Books with chapter gists
// ---------------------------------------------------------------------------
export const bookFile = z
  .object({
    title: z.string().min(1),
    author: z.string().optional(),
    edition: text.optional(),
    description: z.string().default(''),
    position: z.number().int(),
    published: z.boolean().default(true),
  })
  .strict()

/** covers: tree paths relative to the subject, e.g. "ancient/india" (or "" / "." for the whole subject). */
export const chapterFrontmatter = z
  .object({
    slug,
    number: z.number().int().positive(),
    title: z.string().min(1),
    covers: z.array(z.string().regex(/^[a-z0-9-]+(\/[a-z0-9-]+)*$/, 'must be a path like ancient/india')).min(1),
  })
  .strict()
