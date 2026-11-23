/**
 * Manage who can sign up.
 *   npm run invite -- a@b.com c@d.com    add emails
 *   npm run invite -- --list             list invited emails
 *   npm run invite -- --remove a@b.com   remove an email
 */
import { createAdminClient } from '../lib/supabase/admin'

async function main(args: string[]) {
  const db = createAdminClient()

  if (args[0] === '--list') {
    const { data, error } = await db.from('allowed_emails').select('email, added_at').order('added_at')
    if (error) throw error
    if (!data.length) console.log('No one is invited yet.')
    for (const row of data) console.log(`${row.email}\t${new Date(row.added_at).toISOString().slice(0, 10)}`)
    return
  }

  if (args[0] === '--remove') {
    const emails = args.slice(1).map((e) => e.trim().toLowerCase())
    if (!emails.length) throw new Error('Usage: npm run invite -- --remove <email>')
    for (const email of emails) {
      const { data, error } = await db.from('allowed_emails').delete().eq('email', email).select('email')
      if (error) throw error
      console.log(data.length ? `removed ${email}` : `not invited ${email}`)
    }
    return
  }

  const emails = args.map((e) => e.trim().toLowerCase()).filter(Boolean)
  if (!emails.length) throw new Error('Usage: npm run invite -- <email> [more emails] | --list | --remove <email>')
  for (const email of emails) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.log(`skipped ${email} (not an email address)`)
      continue
    }
    const { data, error } = await db
      .from('allowed_emails')
      .upsert({ email }, { onConflict: 'email', ignoreDuplicates: true })
      .select('email')
    if (error) throw error
    console.log(data.length ? `added ${email}` : `already invited ${email}`)
  }
}

main(process.argv.slice(2)).catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
