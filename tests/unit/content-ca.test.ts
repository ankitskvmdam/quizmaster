import { describe, expect, it } from 'vitest'
import { ContentError, loadContent } from '@/lib/content/load'

describe('loadContent with sections and current affairs', () => {
  it('reads sections and puts a topic without a section into the only topics section', async () => {
    const b = await loadContent('tests/fixtures/content-ca')
    expect(b.sections.map((s) => [s.slug, s.kind, s.position])).toEqual([
      ['current-affairs', 'current_affairs', 1],
      ['maths-reasoning', 'topics', 2],
    ])
    expect(b.topics.map((t) => [t.slug, t.sectionSlug])).toEqual([['percentages', 'maths-reasoning']])
  })

  it('reads categories in file order', async () => {
    const b = await loadContent('tests/fixtures/content-ca')
    expect(b.categories).toEqual([
      { slug: 'appointments', name: 'Appointments', position: 1 },
      { slug: 'awards', name: 'Awards & Honours', position: 2 },
      { slug: 'sports', name: 'Sports', position: 3 },
    ])
  })

  it('reads months and their notes', async () => {
    const b = await loadContent('tests/fixtures/content-ca')
    expect(b.months.map((m) => [m.subjectSlug, m.sectionSlug, m.month])).toEqual([
      ['gs', 'current-affairs', '2099-01'],
      ['gs', 'current-affairs', '2099-02'],
    ])
    expect(b.months[0].notes[0]).toEqual({
      slug: 'n1',
      categorySlug: 'appointments',
      happenedOn: '2099-01-14',
      body_md: '**A** appointed …',
      angle_md: 'Succeeds B',
      position: 1,
    })
    expect(b.months[0].notes[2]).toMatchObject({ slug: 'n3', happenedOn: null, angle_md: null, position: 3 })
  })

  it('links current-affairs questions to their month and category, not a topic', async () => {
    const b = await loadContent('tests/fixtures/content-ca')
    const ca = b.questions.filter((q) => q.caMonthRef)
    expect(ca).toHaveLength(8)
    expect(ca[0]).toMatchObject({ topicRef: null, caMonthRef: 'gs/current-affairs/2099-01', categorySlug: 'appointments' })
    expect(b.questions.find((q) => q.slug === 'fx-pct-1')).toMatchObject({ topicRef: 'gs/percentages', caMonthRef: null, categorySlug: null })
  })

  it("turns a month's test.yaml into a fixed paper with current-affairs marking", async () => {
    const b = await loadContent('tests/fixtures/content-ca')
    expect(b.tests).toEqual([
      {
        slug: 'ca-current-affairs-2099-01',
        title: 'January 2099 test',
        kind: 'mock',
        subjectSlug: 'gs',
        year: null,
        durationSec: 1500,
        marksCorrect: 1,
        marksWrong: -0.33,
        published: true,
        questionSlugs: ['fx-ca-2099-01-001', 'fx-ca-2099-01-002', 'fx-ca-2099-01-004', 'fx-ca-2099-01-005', 'fx-ca-2099-01-006'],
        caMonthRef: 'gs/current-affairs/2099-01',
      },
    ])
  })
})

describe('loadContent current-affairs validation', () => {
  it('reports every problem with months, notes, papers and reserved names', async () => {
    const err = await loadContent('tests/fixtures/content-ca-invalid').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ContentError)
    const messages = (err as ContentError).issues.map((i) => i.message)
    expect(messages).toHaveLength(6)
    for (const fragment of ['2099-13', 'weather', 'duplicate', '2099-02-03', 'not in this month', 'reserved']) {
      expect(messages.some((m) => m.includes(fragment)), fragment).toBe(true)
    }
  })
})
