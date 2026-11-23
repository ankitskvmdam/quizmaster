import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

/** Lesson ids the signed-in user has marked done. RLS limits lesson_progress to the caller. */
export const getDoneLessonIds = cache(async (): Promise<Set<string>> => {
  const supabase = await createClient()
  const { data, error } = await supabase.from('lesson_progress').select('lesson_id')
  if (error) throw new Error(`Could not load progress: ${error.message}`)
  return new Set(data.map((r) => r.lesson_id))
})
