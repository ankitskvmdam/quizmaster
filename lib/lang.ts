/**
 * Content language. Content shows in Hindi by default and falls back to English, field by field, wherever a
 * translation is missing. Only content is translated; the app's own labels stay English.
 */
export type ContentLang = 'hi' | 'en'
export const CONTENT_LANGS: { value: ContentLang; label: string }[] = [
  { value: 'hi', label: 'हिन्दी' },
  { value: 'en', label: 'English' },
]

export function parseContentLang(v: unknown): ContentLang {
  return v === 'en' ? 'en' : 'hi'
}

/** The Hindi text when Hindi is chosen and present, otherwise the English. */
export function pick(lang: ContentLang, en: string, hi: string | null | undefined): string {
  return lang === 'hi' && hi ? hi : en
}

type Option = { key: string; text_md: string }

/** Hindi options only when they carry exactly the English letters, so the answer key always lines up. */
export function pickOptions(lang: ContentLang, en: Option[], hi: unknown): Option[] {
  if (lang !== 'hi' || !Array.isArray(hi)) return en
  const opts = hi as Option[]
  const same = opts.length === en.length && opts.every((o, i) => o?.key === en[i].key && typeof o.text_md === 'string')
  return same ? opts : en
}

type RawResult = { is_correct: boolean; correct_key: string; explanation_md: string; explanation_md_hi?: string | null }
type RawQuestion = { stem_md: string; stem_md_hi?: string | null; options: Option[]; options_hi?: unknown }

export function localizeResult<R extends RawResult>(lang: ContentLang, r: R | null): R | null {
  return r ? { ...r, explanation_md: pick(lang, r.explanation_md, r.explanation_md_hi) } : null
}

function localizeQuestion<Q extends RawQuestion>(lang: ContentLang, q: Q): Q {
  return { ...q, stem_md: pick(lang, q.stem_md, q.stem_md_hi), options: pickOptions(lang, q.options, q.options_hi) }
}

/** A running attempt (get_attempt) in the chosen language. */
export function localizeAttempt<
  P extends { test: { title: string; title_hi?: string | null }; questions: (RawQuestion & { result: RawResult | null })[] },
>(lang: ContentLang, p: P): P {
  return {
    ...p,
    test: { ...p.test, title: pick(lang, p.test.title, p.test.title_hi) },
    questions: p.questions.map((q) => ({ ...localizeQuestion(lang, q), result: localizeResult(lang, q.result) })),
  }
}

/** A finished attempt's review (get_attempt_review) in the chosen language. */
export function localizeReview<
  P extends { test: { title: string; title_hi?: string | null }; questions: (RawQuestion & { explanation_md: string; explanation_md_hi?: string | null })[] },
>(lang: ContentLang, p: P): P {
  return {
    ...p,
    test: { ...p.test, title: pick(lang, p.test.title, p.test.title_hi) },
    questions: p.questions.map((q) => ({ ...localizeQuestion(lang, q), explanation_md: pick(lang, q.explanation_md, q.explanation_md_hi) })),
  }
}
