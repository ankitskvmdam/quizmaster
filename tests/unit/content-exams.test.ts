import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { ContentError, loadContent } from '@/lib/content/load'

const ROOT = 'tests/fixtures/content-exams'
const work = mkdtempSync(path.join(tmpdir(), 'qm-exams-'))
afterAll(() => rmSync(work, { recursive: true, force: true }))

async function problemsWith(edit: (dir: string) => void): Promise<string[]> {
  const dir = mkdtempSync(path.join(work, 'case-'))
  cpSync(ROOT, dir, { recursive: true })
  edit(dir)
  try {
    await loadContent(dir)
    return []
  } catch (e) {
    if (!(e instanceof ContentError)) throw e
    return e.issues.map((i) => `${i.file}: ${i.message}`)
  }
}

describe('loadContent: exams and previous-year papers', () => {
  it('reads exams in position order, with Hindi names', async () => {
    const b = await loadContent(ROOT)
    expect(b.exams.map((e) => [e.slug, e.name, e.name_hi ?? null])).toEqual([
      ['bpsc', 'BPSC', 'बीपीएससी'],
      ['ssc-cgl', 'SSC CGL', null],
    ])
  })

  it('turns each paper into a pyq test with its exam, year (from the folder), date, label and the exam defaults', async () => {
    const b = await loadContent(ROOT)
    expect(b.tests.find((t) => t.slug === 'pyq-bpsc-69th-prelims')).toMatchObject({
      kind: 'pyq',
      examSlug: 'bpsc',
      year: 2023,
      paperDate: '2023-09-30',
      paperLabel: 'Set A',
      durationSec: 7200,
      marksCorrect: 1,
      marksWrong: -0.33,
      subjectSlug: null,
      questionSlugs: ['fx-pyq-bpsc69-001', 'fx-pyq-bpsc69-002'],
      title_hi: 'बीपीएससी 69वीं प्रारंभिक',
    })
  })

  it('lets a paper override the exam marks', async () => {
    const b = await loadContent(ROOT)
    expect(b.tests.find((t) => t.slug === 'pyq-bpsc-68th-prelims')).toMatchObject({ year: 2022, marksCorrect: 1, marksWrong: 0 })
  })

  it('makes paper questions belong to the paper unless tagged to a syllabus node', async () => {
    const b = await loadContent(ROOT)
    expect(b.questions.find((q) => q.slug === 'fx-pyq-bpsc69-001')).toMatchObject({ paperRef: 'pyq-bpsc-69th-prelims', topicRef: null })
    expect(b.questions.find((q) => q.slug === 'fx-pyq-bpsc69-002')).toMatchObject({ paperRef: null, topicRef: 'gs/history/ancient/india' })
    expect(b.questions.find((q) => q.slug === 'fx-pyq-bpsc69-001')?.stem_md_hi).toBe('प्रश्न 1857 में?')
  })

  it('reports a paper outside a year folder, an unknown topic, a paper without its exam, and a duplicate paper slug', async () => {
    const p = await problemsWith((dir) => {
      writeFileSync(path.join(dir, 'exams/bpsc/stray.yaml'), 'x: 1\n')
      writeFileSync(
        path.join(dir, 'exams/bpsc/2023/bad-topic.yaml'),
        'slug: bad-topic\ntitle: T\ndate: 2023-01-01\nlabel: L\nquestions:\n  - { slug: fx-bad-1, difficulty: easy, stem: "Q?", options: { A: "a", B: "b" }, answer: A, explanation: "x", topic: gs/nowhere/here }\n',
      )
      writeFileSync(
        path.join(dir, 'exams/bpsc/2023/dup.yaml'),
        'slug: 69th-prelims\ntitle: T\ndate: 2023-01-01\nlabel: L\nquestions:\n  - { slug: fx-dup-1, difficulty: easy, stem: "Q?", options: { A: "a", B: "b" }, answer: A, explanation: "x" }\n',
      )
      rmSync(path.join(dir, 'exams/ssc-cgl/exam.yaml'))
    })
    const has = (file: string, text: string) => expect(p.some((x) => x.includes(file) && x.includes(text)), `${file} ~ ${text}\n${p.join('\n')}`).toBe(true)
    has('exams/bpsc/stray.yaml', 'year folder')
    has('exams/bpsc/2023/bad-topic.yaml', 'gs/nowhere/here')
    has('exams/ssc-cgl', 'exam.yaml')
    has('exams/bpsc/2023/dup.yaml', 'pyq-bpsc-69th-prelims')
  })
})
