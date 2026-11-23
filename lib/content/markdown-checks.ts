/**
 * A plain line right under a list item, with no blank line between, is folded into that item by Markdown ("lazy
 * continuation"): "2. Two.\nWhich of the above…" renders as one list item. Returns that line, or null.
 */
export function foldedIntoList(md: string): string | null {
  const lines = md.split('\n')
  const isItem = (l: string) => /^\s*(\d+[.)]|[-*+])\s/.test(l)
  for (let i = 1; i < lines.length; i++) {
    const cur = lines[i]
    if (isItem(lines[i - 1]) && cur.trim() && !isItem(cur) && !/^\s/.test(cur) && !cur.trim().startsWith('|')) return cur.trim()
  }
  return null
}

/** The digit sequences in a text, sorted: two texts that state the same dates and figures give the same result. */
export function numbersIn(text: string | null | undefined): string {
  return (String(text ?? '').match(/\d+/g) ?? []).sort().join(', ')
}
