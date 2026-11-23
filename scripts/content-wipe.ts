/**
 * Delete ALL content (courses, trees, lessons, books, questions, tests, current affairs) and every attempt.
 * People and the invite list stay. Without --yes it only shows what would be deleted.
 *   npm run content:wipe            show counts
 *   npm run content:wipe -- --yes   delete
 * For the live site: npx tsx --env-file=.env.cloud scripts/content-wipe.ts [--yes]
 */
import { createAdminClient } from '../lib/supabase/admin'
import { wipeContent } from '../lib/content/wipe'

async function main(args: string[]) {
  const yes = args.includes('--yes')
  const target = process.env.NEXT_PUBLIC_SUPABASE_URL
  const counts = await wipeContent(createAdminClient(), { yes })
  console.log(`${yes ? 'Deleted' : 'Would delete'} on ${target}:`)
  console.table(counts)
  if (!yes) console.log('Nothing was deleted. Run again with --yes to delete.')
}

main(process.argv.slice(2)).catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
