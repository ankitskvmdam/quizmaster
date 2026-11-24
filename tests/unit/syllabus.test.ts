import { describe, expect, it } from 'vitest'
import {
  buildSyllabusView,
  hasSyllabus,
  isMostlyCurrent,
  loadSyllabus,
  paperShare,
  parseSyllabus,
  priorityOf,
  sourceLine,
} from '@/lib/syllabus'

const DIR = 'tests/fixtures/syllabus'

describe('loadSyllabus', () => {
  it('reads an exam file and fills in missing learn lists', async () => {
    const s = await loadSyllabus('demo', DIR)
    expect(s?.papers).toBe(8)
    expect(s?.subjects.map((x) => x.key)).toEqual(['polity', 'history'])
    const quit = s!.subjects[1].topics[0].chapters.find((c) => c.name === 'Quit India Movement')!
    expect(quit.learn).toEqual([])
    expect(quit.note).toBeUndefined()
  })

  it('returns null for an exam with no file', async () => {
    expect(await loadSyllabus('csat', DIR)).toBeNull()
  })

  it('refuses slugs that are not plain exam slugs', async () => {
    expect(await loadSyllabus('../syllabus/demo', DIR)).toBeNull()
    expect(await loadSyllabus('Demo', DIR)).toBeNull()
    expect(await loadSyllabus('', DIR)).toBeNull()
  })

  it('reports whether a file exists', async () => {
    expect(await hasSyllabus('demo', DIR)).toBe(true)
    expect(await hasSyllabus('csat', DIR)).toBe(false)
    expect(await hasSyllabus('../x', DIR)).toBe(false)
  })
})

describe('parseSyllabus', () => {
  it('rejects a file of the wrong shape', () => {
    expect(() => parseSyllabus({ exam: 'x', papers: 'eight' })).toThrow()
  })
})

const ch = (papers: number, extra: Partial<{ questions: number; current: number; bihar: number }> = {}) => ({
  name: 'c',
  questions: extra.questions ?? 1,
  papers,
  learn: [],
  ...extra,
})

describe('paperShare', () => {
  it('is the share of analysed papers the chapter was asked in', () => {
    expect(paperShare(ch(4), 8)).toBe(0.5)
    expect(paperShare(ch(8), 8)).toBe(1)
  })
  it('stays within 0..1 and survives zero papers', () => {
    expect(paperShare(ch(9), 8)).toBe(1)
    expect(paperShare(ch(3), 0)).toBe(0)
  })
})

describe('priorityOf', () => {
  it('is high when asked in at least half the papers', () => {
    expect(priorityOf(ch(4), 8)).toBe('high')
    expect(priorityOf(ch(25), 50)).toBe('high')
    expect(priorityOf(ch(2), 4)).toBe('high')
  })
  it('is medium from a quarter, low below', () => {
    expect(priorityOf(ch(3), 8)).toBe('medium')
    expect(priorityOf(ch(2), 8)).toBe('medium')
    expect(priorityOf(ch(1), 8)).toBe('low')
    expect(priorityOf(ch(12), 50)).toBe('low')
  })
})

describe('isMostlyCurrent', () => {
  it('needs more than half the questions to be current affairs', () => {
    expect(isMostlyCurrent(ch(1, { questions: 6, current: 4 }))).toBe(true)
    expect(isMostlyCurrent(ch(1, { questions: 4, current: 2 }))).toBe(false)
    expect(isMostlyCurrent(ch(1, { questions: 4 }))).toBe(false)
  })
})

describe('sourceLine', () => {
  it('says how many papers and questions the syllabus was built from', () => {
    expect(sourceLine({ papers: 8, questions: 1183 })).toBe('Built from 8 previous papers (1,183 questions)')
    expect(sourceLine({ papers: 1, questions: 1 })).toBe('Built from 1 previous paper (1 question)')
  })
})

describe('buildSyllabusView', () => {
  it('orders subjects by questions per paper and weighs them against the heaviest', async () => {
    const v = buildSyllabusView((await loadSyllabus('demo', DIR))!)
    expect(v.subjects.map((s) => s.key)).toEqual(['history', 'polity'])
    expect(v.subjects.map((s) => s.weight)).toEqual([1, 0.3])
    expect(v.subjects[0].anchor).toBe('subject-history')
  })

  it('drops empty topics and orders topics by questions', async () => {
    const v = buildSyllabusView((await loadSyllabus('demo', DIR))!)
    expect(v.subjects[1].topics.map((t) => t.key)).toEqual(['constitution'])
    expect(v.subjects[0].topics.map((t) => t.key)).toEqual(['events', 'modern'])
  })

  it('orders chapters by papers asked in, then questions, and tags each', async () => {
    const v = buildSyllabusView((await loadSyllabus('demo', DIR))!)
    const modern = v.subjects[0].topics[1]
    expect(modern.chapters.map((c) => c.name)).toEqual(['Champaran Satyagraha', 'Revolutionary Movement', 'Quit India Movement'])
    expect(modern.chapters.map((c) => c.priority)).toEqual(['high', 'medium', 'low'])
    expect(modern.chapters[0].share).toBe(0.75)
    expect(modern.highCount).toBe(1)
    const events = v.subjects[0].topics[0]
    expect(events.chapters.map((c) => c.name)).toEqual(['Awards', 'Summits'])
    expect(events.chapters.map((c) => c.mostlyCurrent)).toEqual([true, false])
    expect(events.anchor).toBe('topic-history-events')
  })

  it('does not change the parsed syllabus', async () => {
    const s = (await loadSyllabus('demo', DIR))!
    const before = JSON.stringify(s)
    buildSyllabusView(s)
    expect(JSON.stringify(s)).toBe(before)
  })
})
