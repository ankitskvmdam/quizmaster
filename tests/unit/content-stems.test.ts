import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ContentError, loadContent } from '@/lib/content/load'

// A statement question whose closing line sits right under the last numbered statement: Markdown folds that line
// into statement 3, so learners see "3. … Which of the statements given above is/are correct?".
const folded = `- slug: fx-stem-folded
  difficulty: hard
  stem: |
    Consider the following statements:
    1. One.
    2. Two.
    Which of the statements given above is/are correct?
  options: { A: "1 only", B: "2 only" }
  answer: A
  explanation: x
`
const ok = `- slug: fx-stem-ok
  difficulty: hard
  stem: |
    Consider the following statements:
    1. One.
    2. Two.

    Which of the statements given above is/are correct?
  options: { A: "1 only", B: "2 only" }
  answer: A
  explanation: x
`

let root: string
beforeAll(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'qm-stems-'))
  await mkdir(path.join(root, 'gs/history'), { recursive: true })
  await writeFile(path.join(root, 'gs/course.yaml'), 'slug: gs\nname: GS\nposition: 1\n')
  await writeFile(path.join(root, 'gs/history/topic.yaml'), 'slug: history\nname: History\nposition: 1\n')
})
afterAll(() => rm(root, { recursive: true, force: true }))

describe('loadContent: multi-line question stems', () => {
  it('rejects a line that Markdown would fold into the list above it', async () => {
    await writeFile(path.join(root, 'gs/history/questions.yaml'), folded)
    const err = await loadContent(root).catch((e) => e)
    expect(err).toBeInstanceOf(ContentError)
    expect((err as ContentError).issues.map((i) => i.message)).toEqual([
      'fx-stem-folded: stem: put a blank line between the last list item and "Which of the statements given above is/are correct?"',
    ])
  })

  it('accepts the same stem with a blank line after the list', async () => {
    await writeFile(path.join(root, 'gs/history/questions.yaml'), ok)
    const b = await loadContent(root)
    expect(b.questions.map((q) => q.slug)).toEqual(['fx-stem-ok'])
  })
})
