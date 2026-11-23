import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

type Db = SupabaseClient<Database>
type Table = keyof Database['public']['Tables']

/**
 * Every table that holds content or activity on content, in an order that respects foreign keys.
 * People (auth users, profiles) and the invite list are never touched.
 */
export const CONTENT_TABLES: Table[] = [
  'attempts', // attempt_answers cascade
  'test_questions',
  'questions', // before tests: a paper's questions point at their test
  'tests',
  'lesson_progress',
  'lessons',
  'chapter_progress',
  'chapter_topics',
  'book_chapters',
  'books',
  'ca_progress',
  'ca_notes',
  'ca_months',
  'ca_categories',
  'topics',
  'sections',
  'subjects',
  'exams',
]

/** A filter that matches every row, by a column each table is guaranteed to have. */
const KEY: Partial<Record<Table, string>> = {
  lesson_progress: 'lesson_id',
  chapter_progress: 'chapter_id',
  chapter_topics: 'chapter_id',
  ca_progress: 'month_id',
  ca_categories: 'slug',
  test_questions: 'test_id',
  exams: 'slug',
}

/** Counts content rows; with `yes`, deletes them all. Returns the counts found before deleting. */
export async function wipeContent(db: Db, opts: { yes: boolean }): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}
  for (const t of CONTENT_TABLES) {
    const { count, error } = await db.from(t).select('*', { count: 'exact', head: true })
    if (error) throw new Error(`count ${t}: ${error.message}`)
    counts[t] = count ?? 0
  }
  if (!opts.yes) return counts
  for (const t of CONTENT_TABLES) {
    const { error } = await db.from(t).delete().not(KEY[t] ?? 'id', 'is', null)
    if (error) throw new Error(`delete ${t}: ${error.message}`)
  }
  return counts
}
