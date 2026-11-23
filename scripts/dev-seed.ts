/**
 * Local development only: (re)create the demo account and push content.
 *   npm run dev:seed                     demo account + content/
 *   npm run dev:seed -- <folder>         demo account + that folder
 * Demo account: demo@quizmaster.test / Demo1234
 */
import path from 'node:path'
import { createAdminClient } from '../lib/supabase/admin'
import { loadContent } from '../lib/content/load'
import { pushContent } from '../lib/content/push'

const DEMO = { email: 'demo@quizmaster.test', password: 'Demo1234', name: 'Demo Learner' }

async function main(args: string[]) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  if (!/127\.0\.0\.1|localhost/.test(url)) throw new Error(`dev:seed only runs against a local database, not ${url}`)
  const db = createAdminClient()

  await db.from('allowed_emails').upsert({ email: DEMO.email }, { onConflict: 'email', ignoreDuplicates: true })
  const { data: users } = await db.auth.admin.listUsers({ perPage: 1000 })
  if (!users?.users.some((u) => u.email === DEMO.email)) {
    const { error } = await db.auth.admin.createUser({
      email: DEMO.email,
      password: DEMO.password,
      email_confirm: true,
      user_metadata: { display_name: DEMO.name },
    })
    if (error) throw error
    console.log(`Created ${DEMO.email} / ${DEMO.password}`)
  } else {
    console.log(`${DEMO.email} already exists (password ${DEMO.password})`)
  }

  const folder = path.resolve(args[0] ?? 'content')
  const summary = await pushContent(await loadContent(folder), db, { dry: false, prune: false })
  console.log(`Pushed ${path.relative(process.cwd(), folder)}:`)
  console.table(summary)
}

main(process.argv.slice(2)).catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
