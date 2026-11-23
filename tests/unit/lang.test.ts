import { describe, expect, it } from 'vitest'
import { localizeAttempt, localizeResult, localizeReview, parseContentLang, pick } from '@/lib/lang'

const hiOptions = [
  { key: 'A', text_md: 'अशोक' },
  { key: 'B', text_md: 'अकबर' },
]
const enOptions = [
  { key: 'A', text_md: 'Ashoka' },
  { key: 'B', text_md: 'Akbar' },
]

describe('pick', () => {
  it('uses Hindi when chosen and present', () => expect(pick('hi', 'History', 'इतिहास')).toBe('इतिहास'))
  it('falls back to English when the Hindi is missing or empty', () => {
    expect(pick('hi', 'History', null)).toBe('History')
    expect(pick('hi', 'History', '')).toBe('History')
    expect(pick('hi', 'History', undefined)).toBe('History')
  })
  it('uses English when English is chosen', () => expect(pick('en', 'History', 'इतिहास')).toBe('History'))
})

describe('parseContentLang', () => {
  it('defaults to Hindi for anything unknown', () => {
    expect(parseContentLang('en')).toBe('en')
    expect(parseContentLang('hi')).toBe('hi')
    expect(parseContentLang(null)).toBe('hi')
    expect(parseContentLang('fr')).toBe('hi')
  })
})

const raw = {
  attempt: { id: 'a', mode: 'practice' as const, started_at: '', deadline_at: null, submitted_at: null },
  server_now: '',
  test: { id: 't', title: 'Quiz', title_hi: 'प्रश्नोत्तरी', kind: 'chapter' as const, duration_sec: null, marks_correct: 1, marks_wrong: 0 },
  questions: [
    {
      id: 'q1', position: 1, topic_name: 'x', selected_key: 'A', marked: false,
      stem_md: 'Who?', stem_md_hi: 'कौन?', options: enOptions, options_hi: hiOptions,
      result: { is_correct: true, correct_key: 'A', explanation_md: 'Because.', explanation_md_hi: 'क्योंकि।' },
    },
    {
      id: 'q2', position: 2, topic_name: 'x', selected_key: null, marked: false,
      stem_md: 'When?', stem_md_hi: null, options: enOptions, options_hi: null, result: null,
    },
  ],
}

describe('localizeAttempt', () => {
  it('shows each question in Hindi, falling back per question', () => {
    const p = localizeAttempt('hi', raw)
    expect(p.test.title).toBe('प्रश्नोत्तरी')
    expect(p.questions[0]).toMatchObject({ stem_md: 'कौन?', options: hiOptions, result: { explanation_md: 'क्योंकि।', correct_key: 'A' } })
    expect(p.questions[1]).toMatchObject({ stem_md: 'When?', options: enOptions })
  })
  it('keeps English when English is chosen', () => {
    const p = localizeAttempt('en', raw)
    expect(p.test.title).toBe('Quiz')
    expect(p.questions[0]).toMatchObject({ stem_md: 'Who?', options: enOptions, result: { explanation_md: 'Because.' } })
  })
  it('falls back to English options if the Hindi options do not match the English letters', () => {
    const bad = { ...raw, questions: [{ ...raw.questions[0], options_hi: [{ key: 'A', text_md: 'अशोक' }] }] }
    expect(localizeAttempt('hi', bad).questions[0].options).toEqual(enOptions)
  })
})

describe('localizeResult and localizeReview', () => {
  it('picks the explanation of a checked practice answer', () => {
    expect(localizeResult('hi', { is_correct: false, correct_key: 'B', explanation_md: 'E', explanation_md_hi: 'हि' })?.explanation_md).toBe('हि')
    expect(localizeResult('hi', null)).toBeNull()
  })
  it('localizes a review', () => {
    const review = {
      attempt: {}, test: { title: 'Quiz', title_hi: 'प्रश्नोत्तरी' },
      questions: [{ stem_md: 'Who?', stem_md_hi: 'कौन?', options: enOptions, options_hi: hiOptions, explanation_md: 'B', explanation_md_hi: 'क' }],
    }
    const r = localizeReview('hi', review)
    expect(r.test.title).toBe('प्रश्नोत्तरी')
    expect(r.questions[0]).toMatchObject({ stem_md: 'कौन?', options: hiOptions, explanation_md: 'क' })
  })
})
