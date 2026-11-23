'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type ActionResult = { error: string } | undefined

/** Database functions raise P0001 with a message meant for people; anything else gets a generic one. */
function message(error: { code?: string; message: string }) {
  return error.code === 'P0001' ? error.message : 'Something went wrong. Try again.'
}

export async function markLessonDone(lessonId: string, done: boolean): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = done
    ? await supabase.from('lesson_progress').upsert({ lesson_id: lessonId }, { onConflict: 'user_id,lesson_id', ignoreDuplicates: true })
    : await supabase.from('lesson_progress').delete().eq('lesson_id', lessonId)
  if (error) return { error: 'Could not save your progress. Try again.' }
  revalidatePath('/', 'layout')
}

/** Starts an attempt and goes to the runner. Resumes an open attempt for the same test and mode. */
export async function startTest(testId: string, mode: 'timed' | 'practice'): Promise<ActionResult> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('start_attempt', { p_test_id: testId, p_mode: mode })
  if (error) return { error: message(error) }
  redirect(`/attempt/${data}`)
}

/** A 10-question untimed practice set from one topic. */
export async function startTopicPractice(topicId: string): Promise<ActionResult> {
  return startCustom([topicId], 10, null, 'practice')
}

async function startCustom(
  topicIds: string[],
  count: number,
  durationSec: number | null,
  mode: 'timed' | 'practice',
): Promise<ActionResult> {
  const supabase = await createClient()
  const created = await supabase.rpc('create_custom_test', {
    p_topic_ids: topicIds,
    p_count: count,
    ...(durationSec ? { p_duration_sec: durationSec } : {}),
  })
  if (created.error) return { error: message(created.error) }
  const started = await supabase.rpc('start_attempt', { p_test_id: created.data, p_mode: mode })
  if (started.error) return { error: message(started.error) }
  redirect(`/attempt/${started.data}`)
}
