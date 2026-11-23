import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { searchHit, type SearchHit, type SearchRow } from '@/lib/search'
import { getContentLang } from './user'

export const MIN_QUERY = 2

/** Chapters, notes, books and sections matching `query`, in the reader's language. RLS hides what they can't see. */
export async function searchContent(query: string): Promise<SearchHit[]> {
  const q = query.trim().slice(0, 100)
  if (q.length < MIN_QUERY) return []
  const [supabase, lang] = await Promise.all([createClient(), getContentLang()])
  const { data, error } = await supabase.rpc('search_content', { p_query: q, p_limit: 40 })
  if (error) throw new Error(`Could not search: ${error.message}`)
  return (data as SearchRow[]).map((r) => searchHit(lang, r, q))
}
