import { pick, type ContentLang } from '@/lib/lang'

/** One row of public.search_content (0012_search.sql). */
export type SearchRow = {
  kind: 'chapter' | 'lesson' | 'book' | 'node'
  course_slug: string
  node_path: string
  book_slug: string | null
  item_slug: string | null
  number: number | null
  title: string
  title_hi: string | null
  body: string
  body_hi: string | null
  rank: number
}

export type Snippet = { before: string; match: string; after: string }
export type SearchHit = { key: string; kind: SearchRow['kind']; kindLabel: string; href: string; title: string; snippet: Snippet }

const KIND_LABEL: Record<SearchRow['kind'], string> = { chapter: 'Chapter', lesson: 'Note', book: 'Book', node: 'Section' }

/** Markdown reduced to the words a reader sees: no headings, bold, list or quote marks. */
export function plainText(md: string): string {
  return md
    .replace(/^#{1,6}\s+(Gist|Key facts)\s*$/gim, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*(?:>\s*)+/gm, '')
    .replace(/^\s*(?:[-*+]|\d+[.)])\s+/gm, '')
    .replace(/\*\*|__|\*|`/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// The same folding as public.search_fold (0012_search.sql): case, chandrabindu → anusvara, nukta letters → base letters.
const NUKTA = '़'
const FOLD: Record<string, string> = {
  'ँ': 'ं',
  'क़': 'क',
  'ख़': 'ख',
  'ग़': 'ग',
  'ज़': 'ज',
  'ड़': 'ड',
  'ढ़': 'ढ',
  'फ़': 'फ',
  'य़': 'य',
}

/** Folded text plus, for each folded character, where it came from in the original. */
function foldWithMap(s: string): { folded: string; from: number[] } {
  let folded = ''
  const from: number[] = []
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (c === NUKTA) continue
    folded += (FOLD[c] ?? c).toLowerCase()
    from.push(i)
  }
  return { folded, from }
}
export const fold = (s: string) => foldWithMap(s).folded

/** Where `query` first occurs in `text`, ignoring case and Hindi spelling variants: [start, end) in `text`. */
function findMatch(text: string, query: string): [number, number] | null {
  const q = fold(query)
  if (!q) return null
  const { folded, from } = foldWithMap(text)
  const i = folded.indexOf(q)
  if (i < 0) return null
  let end = from[i + q.length - 1] + 1
  if (text[end] === NUKTA) end++ // keep a trailing combining nukta with its letter
  return [from[i], end]
}

/** About `radius` characters either side of the first match of `query` (ignoring case and Hindi spelling variants). */
export function snippet(text: string, query: string, radius = 70): Snippet {
  const m = findMatch(text, query)
  if (!m) return { before: text.length > radius * 2 ? text.slice(0, radius * 2).trimEnd() + '…' : text, match: '', after: '' }
  const [at, matchEnd] = m
  // Cut at word boundaries, so the snippet never starts or ends mid-word.
  let start = Math.max(0, at - radius)
  if (start > 0) {
    const space = text.indexOf(' ', start)
    start = space >= 0 && space < at ? space + 1 : start
  }
  let end = Math.min(text.length, matchEnd + radius)
  if (end < text.length) {
    const space = text.lastIndexOf(' ', end)
    end = space > matchEnd ? space : end
  }
  return {
    before: (start > 0 ? '…' : '') + text.slice(start, at),
    match: text.slice(at, matchEnd),
    after: text.slice(matchEnd, end) + (end < text.length ? '…' : ''),
  }
}

/** A text-fragment anchor: browsers scroll to and highlight the first occurrence of the text. */
export function textFragment(text: string): string {
  return '#:~:text=' + encodeURIComponent(text).replace(/-/g, '%2D').replace(/,/g, '%2C')
}

function basePath(r: SearchRow): string {
  const node = `/courses/${r.course_slug}/${r.node_path}`
  switch (r.kind) {
    case 'chapter':
      return `${node}/books/${r.book_slug}/${r.item_slug}`
    case 'book':
      return `${node}/books/${r.book_slug}`
    case 'lesson':
      return `${node}/${r.item_slug}`
    default:
      return node
  }
}

/**
 * A result in the reader's language. The snippet comes from the text in their language when it contains the query,
 * otherwise from the other language (so they see why it matched). The link jumps to the match only when the page
 * they will see contains it.
 */
export function searchHit(lang: ContentLang, r: SearchRow, query: string): SearchHit {
  const shown = plainText(pick(lang, r.body, r.body_hi))
  const other = plainText(lang === 'hi' ? r.body : (r.body_hi ?? ''))
  const title = pick(lang, r.title, r.title_hi)
  const has = (t: string) => fold(query).length > 0 && fold(t).includes(fold(query))
  const text = has(shown) || !has(other) ? shown : other
  const jump = has(shown) || has(title)
  return {
    key: `${r.kind}:${basePath(r)}`,
    kind: r.kind,
    kindLabel: KIND_LABEL[r.kind],
    href: basePath(r) + (jump && has(shown) ? textFragment(snippet(shown, query).match) : ''),
    title: r.kind === 'chapter' && r.number != null ? `${r.number}. ${title}` : title,
    snippet: snippet(text, query),
  }
}
