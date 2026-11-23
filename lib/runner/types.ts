/** Mirrors the JSON returned by the get_attempt database function (0002_attempts.sql). */
export type Option = { key: string; text_md: string }

export type QuestionResult = { is_correct: boolean; correct_key: string; explanation_md: string }

export type AttemptQuestion = {
  id: string
  position: number
  topic_name: string
  stem_md: string
  options: Option[]
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
    kind: 'mock' | 'pyq' | 'custom'
    duration_sec: number | null
    marks_correct: number
    marks_wrong: number
  }
  questions: AttemptQuestion[]
}
