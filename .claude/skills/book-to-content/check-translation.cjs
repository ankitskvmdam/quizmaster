// Strict check of a Hindi book translation against its English original. Run from the repo root:
//   node .claude/skills/book-to-content/check-translation.cjs <english book dir> [chapter number ...]
//   e.g. node .claude/skills/book-to-content/check-translation.cjs content/gs/history/books/spectrum-modern-india 5 6
// The Hindi files are expected at content/translations/hi/<same path under content/>.
// Stricter than `content:push --dry`: it also catches dropped questions, changed numbers (dates, figures), changed
// paragraph / key-fact counts and text left in English.
const fs = require('fs')
const path = require('path')
const { createRequire } = require('module')
const req = createRequire(path.resolve('package.json'))
const YAML = req('yaml')
const matter = req('gray-matter')

const [enArg, ...chapters] = process.argv.slice(2)
if (!enArg) {
  console.error('Usage: node check-translation.cjs <english book dir under content/> [chapter number ...]')
  process.exit(2)
}
const EN = path.resolve(enArg)
const rel = path.relative(path.resolve('content'), EN)
if (rel.startsWith('..')) {
  console.error(`${enArg} is not inside content/`)
  process.exit(2)
}
const HI = path.resolve('content/translations/hi', rel)
const want = chapters.map((n) => String(n).padStart(2, '0'))
const deva = /[ऀ-ॿ]/
const nums = (s) => (String(s ?? '').match(/\d+/g) || []).sort().join(',')
const problems = []
let qCount = 0
let filesOk = 0

for (const f of fs.readdirSync(EN).sort()) {
  if (f === 'quiz.yaml') continue // the whole-book quiz only lists slugs; it has no translation
  if (want.length && !want.some((n) => f.startsWith(n + '-'))) continue
  const hp = path.join(HI, f)
  if (!fs.existsSync(hp)) {
    problems.push(`${f}: MISSING Hindi file`)
    continue
  }
  const enRaw = fs.readFileSync(path.join(EN, f), 'utf8')
  const hiRaw = fs.readFileSync(hp, 'utf8')
  const before = problems.length
  if (f.endsWith('.quiz.yaml')) {
    let en, hi
    try {
      en = YAML.parse(enRaw)
      hi = YAML.parse(hiRaw)
    } catch (e) {
      problems.push(`${f}: YAML error ${e.message}`)
      continue
    }
    if (en.map((q) => q.slug).join(' ') !== hi.map((q) => q.slug).join(' ')) problems.push(`${f}: slug list/order differs (en ${en.length}, hi ${hi.length})`)
    const bySlug = new Map(en.map((q) => [q.slug, q]))
    for (const q of hi) {
      const e = bySlug.get(q.slug)
      if (!e) continue
      qCount++
      for (const k of ['answer', 'difficulty', 'source']) if (q[k] !== e[k]) problems.push(`${f} ${q.slug}: ${k} differs`)
      if (JSON.stringify(q.tags) !== JSON.stringify(e.tags)) problems.push(`${f} ${q.slug}: tags differ`)
      if (Object.keys(q.options).join() !== Object.keys(e.options).join()) problems.push(`${f} ${q.slug}: option letters differ`)
      if (!deva.test(q.stem)) problems.push(`${f} ${q.slug}: stem not in Hindi`)
      if (!deva.test(q.explanation)) problems.push(`${f} ${q.slug}: explanation not in Hindi`)
      for (const k of Object.keys(e.options)) {
        const eo = String(e.options[k])
        const ho = String(q.options[k] ?? '')
        if (/[A-Za-z]{3,}/.test(eo) && !/^[a-dA-D]-\d/.test(eo) && !deva.test(ho)) problems.push(`${f} ${q.slug}: option ${k} not in Hindi: ${ho}`)
        if (nums(eo) !== nums(ho)) problems.push(`${f} ${q.slug}: option ${k} numbers differ [${nums(eo)}] vs [${nums(ho)}]`)
      }
      if (nums(e.stem) !== nums(q.stem)) problems.push(`${f} ${q.slug}: stem numbers differ [${nums(e.stem)}] vs [${nums(q.stem)}]`)
      if (nums(e.explanation) !== nums(q.explanation)) problems.push(`${f} ${q.slug}: explanation numbers differ [${nums(e.explanation)}] vs [${nums(q.explanation)}]`)
    }
  } else if (f.endsWith('.md')) {
    const e = matter(enRaw)
    const h = matter(hiRaw)
    for (const k of ['slug', 'number']) if (e.data[k] !== h.data[k]) problems.push(`${f}: frontmatter ${k} differs`)
    if (JSON.stringify(e.data.covers) !== JSON.stringify(h.data.covers)) problems.push(`${f}: covers differs`)
    if (!deva.test(h.data.title || '')) problems.push(`${f}: title not in Hindi`)
    const b = h.content
    if (!/^## Gist\s*$/m.test(b) || !/^## Key facts\s*$/m.test(b)) problems.push(`${f}: missing ## Gist / ## Key facts heading`)
    const facts = (s) => (s.split(/^## Key facts\s*$/m)[1] || '').split('\n').filter((l) => /^\s*- /.test(l))
    const gist = (s) => s.split(/^## Key facts\s*$/m)[0]
    if (facts(e.content).length !== facts(b).length) problems.push(`${f}: key-fact bullet count ${facts(e.content).length} vs ${facts(b).length}`)
    const paras = (s) => gist(s).split(/\n\s*\n/).filter((p) => p.trim()).length
    if (paras(e.content) !== paras(b)) problems.push(`${f}: gist paragraph count ${paras(e.content)} vs ${paras(b)}`)
    const hLines = facts(b)
    facts(e.content).forEach((l, i) => {
      if (hLines[i] !== undefined && nums(l) !== nums(hLines[i])) problems.push(`${f}: key fact #${i + 1} numbers differ [${nums(l)}] vs [${nums(hLines[i])}]`)
    })
    if (nums(gist(e.content)) !== nums(gist(b))) problems.push(`${f}: gist numbers differ\n   en [${nums(gist(e.content))}]\n   hi [${nums(gist(b))}]`)
    const latin = (gist(b).match(/[A-Za-z]{4,}/g) || []).length
    const words = (gist(b).match(/\S+/g) || []).length
    if (latin > words * 0.25) problems.push(`${f}: gist looks largely untranslated (${latin}/${words} Latin words)`)
  } else if (f === 'book.yaml') {
    const e = YAML.parse(enRaw)
    const h = YAML.parse(hiRaw)
    if (e.position !== h.position) problems.push('book.yaml: position differs')
    if (!deva.test(h.title) || !deva.test(h.description)) problems.push('book.yaml: title/description not in Hindi')
  }
  if (problems.length === before) filesOk++
}
console.log(problems.length ? problems.join('\n') : 'No problems.')
console.log(`Files OK: ${filesOk}; questions checked: ${qCount}`)
process.exit(problems.length ? 1 : 0)
