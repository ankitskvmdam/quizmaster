// Pushes exams and previous-year papers. Runs after push-tree.test.ts and before push-z-hindi.test.ts (file-name order).
import { describe, expect, it } from 'vitest'

process.loadEnvFile('.env.local')
const { createAdminClient } = await import('@/lib/supabase/admin')
const { loadContent } = await import('@/lib/content/load')
const { pushContent } = await import('@/lib/content/push')

const db = createAdminClient()
const push = async (root: string) => pushContent(await loadContent(root), db, { dry: false, prune: false })

describe('pushing exams and previous-year papers', () => {
  it('creates the exams and each paper as a pyq test with its exam, date and label', async () => {
    const s = await push('tests/fixtures/content-exams')
    expect(s.exams.created).toBe(2)
    const { data: exams } = await db.from('exams').select('slug, name, name_hi, position').order('position')
    expect(exams).toEqual([
      { slug: 'bpsc', name: 'BPSC', name_hi: 'बीपीएससी', position: 1 },
      { slug: 'ssc-cgl', name: 'SSC CGL', name_hi: null, position: 2 },
    ])
    const { data: paper } = await db
      .from('tests')
      .select('kind, exam_slug, year, paper_date, paper_label, duration_sec, marks_wrong, subject_id, title_hi, test_questions(count)')
      .eq('slug', 'pyq-bpsc-69th-prelims')
      .single()
    expect(paper).toMatchObject({
      kind: 'pyq',
      exam_slug: 'bpsc',
      year: 2023,
      paper_date: '2023-09-30',
      paper_label: 'Set A',
      duration_sec: 7200,
      subject_id: null,
      title_hi: 'बीपीएससी 69वीं प्रारंभिक',
    })
    expect(Number(paper?.marks_wrong)).toBe(-0.33)
    expect(paper?.test_questions[0]?.count).toBe(2)
  })

  it('makes untagged questions belong to their paper and tagged ones to their section', async () => {
    const { data: paper } = await db.from('tests').select('id').eq('slug', 'pyq-bpsc-69th-prelims').single()
    const { data: q1 } = await db.from('questions').select('paper_test_id, topic_id').eq('slug', 'fx-pyq-bpsc69-001').single()
    expect(q1).toEqual({ paper_test_id: paper!.id, topic_id: null })
    const { data: q2 } = await db.from('questions').select('paper_test_id, topic_id').eq('slug', 'fx-pyq-bpsc69-002').single()
    expect(q2?.paper_test_id).toBeNull()
    expect(q2?.topic_id).not.toBeNull()
  })

  it('changes nothing on a second push', async () => {
    const s = await push('tests/fixtures/content-exams')
    for (const kind of ['exams', 'tests', 'questions'] as const) expect(s[kind].updated + s[kind].created, kind).toBe(0)
  })
})
