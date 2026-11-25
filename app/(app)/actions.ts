'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { parseBuiltTest } from '@/lib/builder'
import { isMonthKey, monthToDate } from '@/lib/periods'
import { parseContentLang } from '@/lib/lang'

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
  chapterIds: string[] = [],
): Promise<ActionResult> {
  const supabase = await createClient()
  const created = await supabase.rpc('create_custom_test', {
    p_topic_ids: topicIds,
    p_count: count,
    ...(durationSec ? { p_duration_sec: durationSec } : {}),
    ...(chapterIds.length ? { p_chapter_ids: chapterIds } : {}),
  })
  if (created.error) return { error: message(created.error) }
  const started = await supabase.rpc('start_attempt', { p_test_id: created.data, p_mode: mode })
  if (started.error) return { error: message(started.error) }
  redirect(`/attempt/${started.data}`)
}

/** The step-by-step builder: sections of chapters, split evenly; the test starts straight away. */
export async function createBuiltTest(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = parseBuiltTest(formData)
  if (!parsed.ok) return { error: parsed.error }
  const { sections, count, durationSec, mode, title } = parsed.value
  const supabase = await createClient()
  const created = await supabase.rpc('create_built_test', {
    p_sections: sections.map((ids) => ({ chapter_ids: ids })),
    p_count: count,
    ...(durationSec ? { p_duration_sec: durationSec } : {}),
    ...(title ? { p_title: title } : {}),
  })
  if (created.error) return { error: message(created.error) }
  const started = await supabase.rpc('start_attempt', { p_test_id: created.data, p_mode: mode })
  if (started.error) return { error: message(started.error) }
  redirect(`/attempt/${started.data}`)
}

/** Deletes a test the person built (the database refuses anyone else's), with its attempts. */
export async function deleteMyTest(testId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('delete_my_test', { p_test_id: testId })
  if (error) return { error: message(error) }
  revalidatePath('/new')
  revalidatePath('/past')
}

/** Ten untimed questions from topics the person has read; from every topic if they haven't read any yet. */
export async function startQuickPractice(): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: read, error } = await supabase.from('lesson_progress').select('lessons(topic_id)')
  if (error) return { error: 'Something went wrong. Try again.' }
  let topicIds = [...new Set(read.map((r) => r.lessons?.topic_id).filter((t): t is string => Boolean(t)))]
  if (!topicIds.length) {
    const { data: all, error: tErr } = await supabase.from('topics').select('id')
    if (tErr) return { error: 'Something went wrong. Try again.' }
    topicIds = all.map((t) => t.id)
  }
  return startCustom(topicIds, 10, null, 'practice')
}

// ---------------------------------------------------------------------------
// Current affairs
// ---------------------------------------------------------------------------
type CaRange = { from: string; to: string; categories?: string[] }

async function startCaSet(range: CaRange, count: number, mode: 'timed' | 'practice'): Promise<ActionResult> {
  if (!isMonthKey(range.from) || !isMonthKey(range.to)) return { error: 'Choose a valid period' }
  const supabase = await createClient()
  const created = await supabase.rpc('create_period_test', {
    p_from: monthToDate(range.from),
    p_to: monthToDate(range.to),
    ...(range.categories?.length ? { p_categories: range.categories } : {}),
    p_count: count,
    ...(mode === 'timed' ? { p_seconds_per_question: 60 } : {}),
  })
  if (created.error) return { error: message(created.error) }
  const started = await supabase.rpc('start_attempt', { p_test_id: created.data, p_mode: mode })
  if (started.error) return { error: message(started.error) }
  redirect(`/attempt/${started.data}`)
}

/** Untimed practice over a month or period, optionally limited to categories. */
export async function startCaPractice(range: CaRange & { count: number }): Promise<ActionResult> {
  return startCaSet(range, range.count, 'practice')
}

/** A timed revision test over a period: 25 or 50 questions, 1 minute each, +1 / −0.33. */
export async function startCaRevision(range: CaRange & { count: 25 | 50 }): Promise<ActionResult> {
  if (range.count !== 25 && range.count !== 50) return { error: 'Choose 25 or 50 questions' }
  return startCaSet(range, range.count, 'timed')
}

export async function markCategoryRead(monthId: string, categorySlug: string, read: boolean): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = read
    ? await supabase
        .from('ca_progress')
        .upsert({ month_id: monthId, category_slug: categorySlug }, { onConflict: 'user_id,month_id,category_slug', ignoreDuplicates: true })
    : await supabase.from('ca_progress').delete().eq('month_id', monthId).eq('category_slug', categorySlug)
  if (error) return { error: 'Could not save your progress. Try again.' }
  revalidatePath('/', 'layout')
}

// ---------------------------------------------------------------------------
// Books
// ---------------------------------------------------------------------------
export async function markChapterRead(chapterId: string, read: boolean): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = read
    ? await supabase.from('chapter_progress').upsert({ chapter_id: chapterId }, { onConflict: 'user_id,chapter_id', ignoreDuplicates: true })
    : await supabase.from('chapter_progress').delete().eq('chapter_id', chapterId)
  if (error) return { error: 'Could not save your progress. Try again.' }
  revalidatePath('/', 'layout')
}

/** Show content in Hindi or English from now on (English is always the fallback for untranslated text). */
export async function setContentLang(lang: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const id = data?.claims?.sub
  if (!id) return { error: 'Sign in again to change this.' }
  const { error } = await supabase.from('profiles').update({ content_lang: parseContentLang(lang) }).eq('id', id)
  if (error) return { error: message(error) }
  revalidatePath('/', 'layout')
}
