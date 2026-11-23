import { describe, expect, it } from 'vitest'
import { ContentError, loadContent } from '@/lib/content/load'

describe('loadContent (valid)', () => {
  it('loads every kind of content with resolved parents', async () => {
    const b = await loadContent('tests/fixtures/content-valid')
    expect(b.subjects.map((s) => s.slug)).toEqual(['gs'])
    expect(b.topics).toEqual([
      { subjectSlug: 'gs', slug: 'percentages', name: 'Percentages', description: 'Parts of a hundred.', position: 1, path: 'percentages', parentPath: null },
    ])
    expect(b.lessons.map((l) => [l.topicPath, l.slug, l.published])).toEqual([
      ['percentages', 'basics', true],
      ['percentages', 'change', false],
    ])
    expect(b.lessons[0].body_md.trim()).toBe('A percentage is a fraction with denominator $100$.')
    expect(b.questions).toHaveLength(3)
    expect(b.tests).toHaveLength(1)
  })

  it('normalises options into an ordered list and coerces numbers to text', async () => {
    const b = await loadContent('tests/fixtures/content-valid')
    const q1 = b.questions.find((q) => q.slug === 'pct-001')!
    expect(q1.options[1]).toEqual({ key: 'B', text_md: '5' })
    expect(q1.correctKey).toBe('B')
    expect(q1.topicRef).toBe('gs/percentages')
    const q2 = b.questions.find((q) => q.slug === 'pct-002')!
    expect(q2.options.map((o) => o.text_md)).toEqual(['60', '80', '100', '120'])
    expect(q2.tags).toEqual(['inverse'])
  })

  it('resolves test questions, including inline ones, in order', async () => {
    const b = await loadContent('tests/fixtures/content-valid')
    expect(b.tests[0]).toMatchObject({
      slug: 'mock-1',
      kind: 'mock',
      subjectSlug: 'gs',
      durationSec: 900,
      marksCorrect: 2,
      marksWrong: -0.66,
      published: true,
      questionSlugs: ['pct-001', 'pct-002', 'pct-inline-001'],
    })
    expect(b.questions.find((q) => q.slug === 'pct-inline-001')?.topicRef).toBe('gs/percentages')
  })
})

describe('loadContent (invalid)', () => {
  it('collects every problem instead of stopping at the first', async () => {
    const err = await loadContent('tests/fixtures/content-invalid').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ContentError)
    const issues = (err as ContentError).issues
    expect(issues).toHaveLength(3)
    expect(issues.some((i) => i.message.includes('answer'))).toBe(true)
    expect(issues.some((i) => i.message.includes('nope-001'))).toBe(true)
    expect(issues.some((i) => i.message.includes('duplicate'))).toBe(true)
    expect(issues.every((i) => i.file.length > 0)).toBe(true)
  })
})
