// Checks one restructured study page (English + its Hindi mirror). Run from the repo root:
//   node .claude/skills/study-content-writing/check-page.mjs <english .md file> [--before <git ref>] [--en-only]
// e.g. node .claude/skills/study-content-writing/check-page.mjs content/gs/history/books/spectrum-modern-india/03-advent-of-europeans.md
//
// It checks three things and exits 1 if any ERROR is found (WARN lines are for a human to read):
//   1. Nothing lost: every number and every word of a bold phrase in the page as it was at <git ref>
//      (default: the tag content-before-restructure) is still in the page, per language.
//   2. Shape: the rules of the study-content-writing skill that a script can test.
//   3. Parity: the Hindi page has the same skeleton as the English one (headings, tables, list items, numbers).
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const args = process.argv.slice(2)
const enFile = args.find((a) => !a.startsWith('--'))
if (!enFile) {
  console.error('Usage: node check-page.mjs <english .md file> [--before <git ref>] [--en-only]')
  process.exit(2)
}
const ref = args.includes('--before') ? args[args.indexOf('--before') + 1] : 'content-before-restructure'
const enOnly = args.includes('--en-only')
const posix = (p) => p.split(path.sep).join('/')
const enRel = posix(path.relative(process.cwd(), path.resolve(enFile)))
if (!enRel.startsWith('content/') || enRel.startsWith('content/translations/')) {
  console.error('Give the English file under content/ (not the translation).')
  process.exit(2)
}
const hiRel = enRel.replace(/^content\//, 'content/translations/hi/')

// Words the writer deliberately reworded, listed in the page's suggestions file under "## Reworded".
const suggestionsRel = `.superpowers/sdd/reading/suggestions/${path.basename(path.dirname(enRel))}/${path.basename(enRel)}`
const reworded = new Set()
if (fs.existsSync(suggestionsRel)) {
  const section = /^## Reworded\s*$([\s\S]*?)(?=^## |\Z)/m.exec(fs.readFileSync(suggestionsRel, 'utf8') + '\n## ')
  for (const line of (section?.[1] ?? '').split('\n')) {
    const m = /^\s*[-*]\s*(.+?)\s*->/.exec(line)
    if (m) for (const w of m[1].match(/[ऀ-ॣ०-ॿ]{4,}|[A-Za-z]{4,}/g) ?? []) reworded.add(w.toLowerCase())
  }
}

const errors = []
const warns = []
const err = (m) => errors.push(m)
const warn = (m) => warns.push(m)

const split = (raw) => {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw)
  return { front: m ? m[1].trim() : '', body: (m ? raw.slice(m[0].length) : raw).replace(/\r/g, '') }
}
const read = (rel) => (fs.existsSync(rel) ? split(fs.readFileSync(rel, 'utf8')) : null)
const old = (rel) => {
  try {
    return split(execFileSync('git', ['show', `${ref}:${rel}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }))
  } catch {
    return null
  }
}
const digits = (s) => s.match(/\d+/g) ?? []
const uniq = (a) => [...new Set(a)]
const sorted = (a) => [...a].sort().join(',')

// ---------------------------------------------------------------------------
// Markdown skeleton
// ---------------------------------------------------------------------------
function skeleton(body) {
  const lines = body.split('\n')
  const headings = []
  const tables = [] // { cols, rows }
  let listItems = 0
  let calloutItems = 0
  let callouts = 0
  const paragraphs = []
  let para = []
  const flush = () => {
    if (para.length) paragraphs.push(para.join(' '))
    para = []
  }
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]
    const h = /^(#{1,6})\s+\S/.exec(l)
    if (h) {
      flush()
      headings.push(h[1].length)
      continue
    }
    if (/^\s*\|/.test(l)) {
      flush()
      const start = i
      while (i + 1 < lines.length && /^\s*\|/.test(lines[i + 1])) i++
      const rows = lines.slice(start, i + 1).filter((r) => !/^\s*\|[\s:|-]+\|\s*$/.test(r))
      const cols = lines[start].split('|').length - 2
      tables.push({ cols, rows: rows.length - 1, line: start + 1 })
      continue
    }
    if (/^>/.test(l)) {
      flush()
      const start = i
      while (i + 1 < lines.length && /^>/.test(lines[i + 1])) i++
      const block = lines.slice(start, i + 1).map((b) => b.replace(/^>\s?/, ''))
      if (/^\*\*[^*]+\*\*\s*$/.test(block[0] ?? '')) {
        callouts++
        calloutItems += block.filter((b) => /^\s*([-*+]|\d+[.)])\s/.test(b)).length
      }
      continue
    }
    if (/^\s*([-*+]|\d+[.)])\s/.test(l)) {
      flush()
      listItems++
      continue
    }
    if (!l.trim()) flush()
    else if (!/^\s{2,}\S/.test(l) || para.length) para.push(l.trim())
  }
  flush()
  return { headings, tables, listItems, callouts, calloutItems, paragraphs }
}

// ---------------------------------------------------------------------------
// 1. Nothing lost
// ---------------------------------------------------------------------------
function nothingLost(lang, before, after) {
  if (!before) return warn(`${lang}: no version at ${ref} to compare with (new page?)`)
  const have = new Set(digits(after.body))
  const missing = uniq(digits(before.body)).filter((n) => !have.has(n))
  // "1615-19" may now read "1615–1619": a short number is fine if a longer one ends with it.
  const reallyMissing = missing.filter((n) => !(n.length <= 2 && [...have].some((x) => x.length > n.length && x.endsWith(n))))
  if (reallyMissing.length) err(`${lang}: numbers in the old page that are gone: ${reallyMissing.join(', ')}`)
  // Bold phrases that end in a colon were section labels in the old gist ("**The Dutch:**"), not facts.
  const bold = uniq((before.body.replace(/\*{3}/g, '**').match(/\*\*[^*]+\*\*/g) ?? []).map((b) => b.slice(2, -2).trim())).filter((b) => !/[:：]$/.test(b))
  const words = uniq(bold.flatMap((b) => b.match(/[ऀ-ॣ०-ॿ]{4,}|[A-Za-z]{4,}/g) ?? []))
  const stem = (w) => w.replace(/(ियों|ियाँ|ों|ें|ीं|ी|े|ा|ो|ं)$/u, '').replace(/(ies|es|s|ed|ing)$/i, '')
  // A nukta added or dropped (फरवरी / फ़रवरी) is the same word.
  const plain = (t) => t.toLowerCase().replace(/़/g, '').replace(/[क़ख़ग़ज़ड़ढ़फ़]/g, (c) => c.normalize('NFD')[0])
  const hay = plain(after.body)
  const gone = words.filter((w) => !hay.includes(plain(w)) && !hay.includes(plain(stem(w))) && !reworded.has(w.toLowerCase()))
  // English proper nouns (capitalised) must survive: an ERROR. Ordinary words, and all Hindi words, are a WARN to
  // read through: they are usually just reworded, and the page must never be worded to suit this script. Latin
  // glosses in the old Hindi page are not checked, since a gloss is given only once now.
  const isLatin = (w) => /^[A-Za-z]/.test(w)
  const names = gone.filter((w) => lang === 'en' && /^[A-Z]/.test(w))
  const ordinary = gone.filter((w) => !names.includes(w) && !(lang === 'hi' && isLatin(w)))
  if (names.length)
    err(
      `${lang}: names from bold phrases of the old page that are gone (${names.length}): ${names.slice(0, 40).join(' | ')}\n` +
        `      Restore each one, or, if it is a spelling variant you unified or the first word of an old label, list it in ${suggestionsRel} under "## Reworded" as "- <old word> -> <what the page says now>"`,
    )
  if (ordinary.length)
    warn(
      `${lang}: words from bold phrases of the old page that are not on the new page (${ordinary.length}): ${ordinary.slice(0, 60).join(' | ')}\n` +
        `      Read through them: fine if each was only reworded; put it back if it is a name, place or term that got lost. Do not change headings or wording just to clear this.`,
    )
  if (before.front !== after.front && lang === 'en') err('en: frontmatter changed')
  // The Hindi title may be respelt to match the page (nukta, one spelling per name); nothing else may change.
  const noTitle = (f) => f.split('\n').filter((l) => !/^title:/.test(l)).join('\n')
  if (lang === 'hi' && noTitle(before.front) !== noTitle(after.front)) err('hi: frontmatter changed (only the title may be respelt)')
}

// ---------------------------------------------------------------------------
// 2. Shape
// ---------------------------------------------------------------------------
function shape(lang, page) {
  const b = page.body
  const sk = skeleton(b)
  if (/^## (Gist|Key facts)\s*$/m.test(b)) err(`${lang}: still has "## Gist" / "## Key facts"`)
  if (sk.headings.includes(1)) err(`${lang}: uses "# " (start at "## ")`)
  if (sk.headings.filter((h) => h === 2).length < 3) err(`${lang}: fewer than three "## " sections`)
  for (const t of sk.tables) if (t.cols > 4) err(`${lang}: table at body line ${t.line} has ${t.cols} columns (4 at most)`)
  if (sk.callouts !== 1) err(`${lang}: expected exactly one callout (a blockquote that starts with a bold title), found ${sk.callouts}`)
  else if (sk.calloutItems < 6 || sk.calloutItems > 12) warn(`${lang}: the callout has ${sk.calloutItems} points (aim for 8 to 10)`)
  const lastHeadingOrQuote = b.trimEnd().split('\n').pop() ?? ''
  if (sk.callouts === 1 && !/^>/.test(lastHeadingOrQuote)) warn(`${lang}: the callout is not the last thing on the page`)
  if (/[{}]|<[A-Za-z/]/.test(b)) err(`${lang}: raw { } or < > in the text`)
  if (/(^|[^*])\*[^*\s][^*]*\*([^*]|$)/m.test(b.replace(/\*\*[^*]+\*\*/g, ''))) warn(`${lang}: italics found (use bold or plain text)`)
  const ender = lang === 'hi' ? /[।?!](?=\s|$)/g : /[.?!](?=\s|$)/g
  const long = sk.paragraphs.filter((p) => (p.replace(/([A-Z]).(?=s?[A-Z])/g, '$1').replace(/\b(e\.g|i\.e|St|Dr|Mr|Mrs|Sir|Lt|Col|Gen|No|vs|etc)\./g, '$1').match(ender) ?? []).length > 3)
  if (long.length) warn(`${lang}: ${long.length} paragraph(s) longer than 3 sentences, e.g. "${long[0].slice(0, 70)}…"`)
  if (lang === 'hi') {
    const latin = (b.match(/[A-Za-z]{4,}/g) ?? []).length
    const words = (b.match(/\S+/g) ?? []).length
    if (latin > words * 0.12) warn(`hi: ${latin} of ${words} words are in Latin letters; gloss a term only on first use`)
    if (/[०-९]/.test(b)) err('hi: Devanagari digits found (use 0-9)')
  }
  return sk
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
const en = read(enRel)
if (!en) {
  console.error(`${enRel} not found`)
  process.exit(2)
}
nothingLost('en', old(enRel), en)
const enSk = shape('en', en)

if (!enOnly) {
  const hi = read(hiRel)
  if (!hi) err(`hi: ${hiRel} not found`)
  else {
    nothingLost('hi', old(hiRel), hi)
    const hiSk = shape('hi', hi)
    // 3. Parity
    if (enSk.headings.join('') !== hiSk.headings.join('')) err(`parity: heading outline differs (en ${enSk.headings.join('')} vs hi ${hiSk.headings.join('')})`)
    if (enSk.tables.length !== hiSk.tables.length) err(`parity: ${enSk.tables.length} tables in English, ${hiSk.tables.length} in Hindi`)
    else
      enSk.tables.forEach((t, i) => {
        const h = hiSk.tables[i]
        if (t.cols !== h.cols || t.rows !== h.rows) err(`parity: table ${i + 1} is ${t.cols}x${t.rows} in English, ${h.cols}x${h.rows} in Hindi`)
      })
    if (enSk.listItems !== hiSk.listItems) err(`parity: ${enSk.listItems} list items in English, ${hiSk.listItems} in Hindi`)
    if (enSk.calloutItems !== hiSk.calloutItems) err(`parity: callout has ${enSk.calloutItems} points in English, ${hiSk.calloutItems} in Hindi`)
    if (sorted(digits(en.body)) !== sorted(digits(hi.body))) {
      const count = (a) => a.reduce((m, n) => m.set(n, (m.get(n) ?? 0) + 1), new Map())
      const [e, h] = [count(digits(en.body)), count(digits(hi.body))]
      const diff = uniq([...e.keys(), ...h.keys()]).filter((n) => (e.get(n) ?? 0) !== (h.get(n) ?? 0))
      err(`parity: numbers differ between English and Hindi: ${diff.map((n) => `${n} (en ${e.get(n) ?? 0}, hi ${h.get(n) ?? 0})`).slice(0, 25).join('; ')}`)
    }
  }
}

for (const w of warns) console.log('WARN  ' + w)
for (const e of errors) console.log('ERROR ' + e)
console.log(errors.length ? `${errors.length} error(s), ${warns.length} warning(s): ${enRel}` : `OK (${warns.length} warning(s)): ${enRel}`)
process.exit(errors.length ? 1 : 0)
