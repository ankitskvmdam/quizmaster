import { describe, expect, it } from 'vitest'
import { plainText, searchHit, snippet, textFragment, type SearchRow } from '@/lib/search'

const row = (over: Partial<SearchRow>): SearchRow => ({
  kind: 'chapter',
  course_slug: 'gs',
  node_path: 'history',
  book_slug: 'spectrum-modern-india',
  item_slug: 'revolt-of-1857',
  number: 7,
  title: 'The Revolt of 1857',
  title_hi: '1857 का विद्रोह',
  body: '## Gist\nThe revolt began at **Meerut** on 10 May 1857.\n\n## Key facts\n- **Kunwar Singh** led it in Bihar.',
  body_hi: '## Gist\nविद्रोह **मेरठ** में 10 मई 1857 को शुरू हुआ।\n\n## Key facts\n- बिहार में **कुंवर सिंह** ने नेतृत्व किया।',
  rank: 1,
  ...over,
})

describe('plainText', () => {
  it('drops Markdown marks and the fixed gist headings', () => {
    expect(plainText(row({}).body)).toBe('The revolt began at Meerut on 10 May 1857. Kunwar Singh led it in Bihar.')
  })
})

describe('snippet', () => {
  it('centres on the first match, case-insensitively, and marks it', () => {
    const s = snippet('The revolt began at Meerut on 10 May 1857. Kunwar Singh led it in Bihar.', 'kunwar', 20)
    expect(s).toEqual({ before: '…on 10 May 1857. ', match: 'Kunwar', after: ' Singh led it in…' })
  })
  it('matches Hindi spelling variants: anusvara for chandrabindu, and letters without their nukta', () => {
    expect(snippet('बिहार में कुँवर सिंह ने नेतृत्व किया।', 'कुंवर', 40).match).toBe('कुँवर')
    expect(snippet('जगदीशपुर के ज़मींदार', 'जमींदार', 40).match).toBe('ज़मींदार')
  })
  it('falls back to the start of the text when the match is not in it', () => {
    expect(snippet('Short text.', 'zzz', 20)).toEqual({ before: 'Short text.', match: '', after: '' })
  })
})

describe('textFragment', () => {
  it('encodes a query for a #:~:text= link, including dashes and commas', () => {
    expect(textFragment('Gandhi-Irwin, 1931')).toBe('#:~:text=Gandhi%2DIrwin%2C%201931')
  })
})

describe('searchHit', () => {
  it('links a chapter to its page and jumps to the match', () => {
    const h = searchHit('en', row({}), 'Kunwar Singh')
    expect(h.href).toBe('/courses/gs/history/books/spectrum-modern-india/revolt-of-1857#:~:text=Kunwar%20Singh')
    expect(h.title).toBe('7. The Revolt of 1857')
    expect(h.kindLabel).toBe('Chapter')
    expect(h.snippet.match).toBe('Kunwar Singh')
  })

  it('shows the Hindi title and Hindi snippet to a Hindi reader', () => {
    const h = searchHit('hi', row({}), 'कुंवर')
    expect(h.title).toBe('7. 1857 का विद्रोह')
    expect(h.snippet.match).toBe('कुंवर')
  })

  it('shows the English snippet to a Hindi reader when only the English matched, without a jump link', () => {
    const h = searchHit('hi', row({}), 'Meerut')
    expect(h.snippet.match).toBe('Meerut')
    expect(h.href).toBe('/courses/gs/history/books/spectrum-modern-india/revolt-of-1857')
  })

  it('links notes, books and sections', () => {
    expect(searchHit('en', row({ kind: 'lesson', node_path: 'history/modern', book_slug: null, item_slug: 'lota-rebellion', number: null }), 'x').href).toBe(
      '/courses/gs/history/modern/lota-rebellion',
    )
    expect(searchHit('en', row({ kind: 'book', item_slug: null, number: null }), 'x').href).toBe('/courses/gs/history/books/spectrum-modern-india')
    expect(searchHit('en', row({ kind: 'node', node_path: 'history/modern', book_slug: null, item_slug: null, number: null }), 'x').href).toBe(
      '/courses/gs/history/modern',
    )
  })
})
