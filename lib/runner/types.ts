/** Mirrors the JSON returned by the get_attempt database function (0002_attempts.sql). */
export type Option = { key: string; text_md: string }

export type QuestionResult = { is_correct: boolean; correct_key: string; explanation_md: string; explanation_md_hi?: string | null }

export type AttemptQuestion = {
  id: string
  position: number
  topic_name: string
  stem_md: string
  stem_md_hi?: string | null
  options: Option[]
  options_hi?: unknown
  selected_key: string | null
  marked: boolean
  result: QuestionResult | null
}

export type AttemptPayload = {
  attempt: {
    id: string
    mode: 'timed' | 'practice'
    started_at: string
    deadline_at: string | null
    submitted_at: string | null
  }
  server_now: string
  test: {
    id: string
    title: string
    title_hi?: string | null
    kind: 'mock' | 'pyq' | 'custom'
    duration_sec: number | null
    marks_correct: number
    marks_wrong: number
  }
  questions: AttemptQuestion[]
}

/** Mirrors get_attempt_review (0002_attempts.sql). */
export type ReviewQuestion = {
  id: string
  position: number
  topic_name: string
  stem_md: string
  stem_md_hi?: string | null
  options: Option[]
  options_hi?: unknown
  selected_key: string | null
  marked: boolean
  correct_key: string
  explanation_md: string
  explanation_md_hi?: string | null
  is_correct: boolean
}

export type ReviewPayload = {
  attempt: {
    id: string
    mode: 'timed' | 'practice'
    started_at: string
    submitted_at: string
    score: number
    n_correct: number
    n_wrong: number
    n_skipped: number
  }
  test: { id: string; title: string; kind: 'mock' | 'pyq' | 'custom'; marks_correct: number; marks_wrong: number }
  questions: ReviewQuestion[]
}

export type ReviewFilter = 'all' | 'wrong' | 'skipped' | 'marked'

export function filterReview(qs: ReviewQuestion[], filter: ReviewFilter): ReviewQuestion[] {
  if (filter === 'wrong') return qs.filter((q) => q.selected_key !== null && !q.is_correct)
  if (filter === 'skipped') return qs.filter((q) => q.selected_key === null)
  if (filter === 'marked') return qs.filter((q) => q.marked)
  return qs
}
