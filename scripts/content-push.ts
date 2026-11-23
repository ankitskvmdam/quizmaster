/**
 * Push the content/ folder into Supabase.
 *   npm run content:push              validate, then create/update by slug
 *   npm run content:push -- --dry     validate and show what would change
 *   npm run content:push -- --prune   also unpublish lessons/tests/subjects removed from the files
 *   npm run content:push -- --force   allow changing the question list of a test people have attempted
 */
import path from 'node:path'
import { ContentError, loadContent } from '../lib/content/load'
import { pushContent } from '../lib/content/push'
import { createAdminClient } from '../lib/supabase/admin'

async function main(args: string[]) {
  const dry = args.includes('--dry')
  const prune = args.includes('--prune')
  const force = args.includes('--force')
  const root = path.resolve(args.find((a) => !a.startsWith('--')) ?? 'content')

  const bundle = await loadContent(root)
  console.log(
    `Valid: ${bundle.subjects.length} subjects, ${bundle.topics.length} topics, ${bundle.lessons.length} lessons, ` +
      `${bundle.questions.length} questions, ${bundle.tests.length} tests, ` +
      `${bundle.months.length} current-affairs months (${bundle.months.reduce((n, m) => n + m.notes.length, 0)} notes).`,
  )
  const summary = await pushContent(bundle, createAdminClient(), { dry, prune, force })
  console.log(dry ? '\nDry run — nothing was written:\n' : '\nPushed:\n')
  console.table(summary)
}

main(process.argv.slice(2)).catch((err: unknown) => {
  if (err instanceof ContentError) {
    console.error(`Content has ${err.issues.length} problem(s); nothing was written:`)
    for (const i of err.issues) console.error(`  ${i.file}: ${i.message}`)
  } else {
    console.error(err instanceof Error ? err.message : err)
  }
  process.exit(1)
})
