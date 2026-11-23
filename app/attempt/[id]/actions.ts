'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { QuestionResult } from '@/lib/runner/types'
import { localizeResult } from '@/lib/lang'
import { getContentLang } from '@/lib/queries/user'

export type SaveResult = { ok: true; result: QuestionResult | null } | { ok: false; error: string; timeUp?: boolean }

const humane = (e: { code?: string; message: string }) =>
  e.code === 'P0001' ? e.message : 'Could not save that answer. Check your connection and try again.'

export async function saveAnswer(
  attemptId: string,
  questionId: string,
  key: string | null,
  marked: boolean,
): Promise<SaveResult> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('save_answer', {
    p_attempt_id: attemptId,
    p_question_id: questionId,
    // The generated types say string, but the function accepts null to clear an answer.
    p_selected_key: key as string,
    p_marked: marked,
  })
  if (error) {
    const timeUp = error.message === 'Time is up for this attempt' || error.message === 'This attempt has been submitted'
    return { ok: false, error: humane(error), timeUp }
  }
  return { ok: true, result: localizeResult(await getContentLang(), (data as QuestionResult | null) ?? null) }
}

export async function submitAttempt(attemptId: string): Promise<{ error: string } | undefined> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('submit_attempt', { p_attempt_id: attemptId })
  if (error) return { error: error.code === 'P0001' ? error.message : 'Could not submit. Check your connection and try again.' }
  revalidatePath('/', 'layout')
  redirect(`/past/attempts/${attemptId}`)
}

export async function setMarked(attemptId: string, questionId: string, marked: boolean): Promise<SaveResult> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('set_marked', { p_attempt_id: attemptId, p_question_id: questionId, p_marked: marked })
  if (error) {
    const timeUp = error.message === 'Time is up for this attempt' || error.message === 'This attempt has been submitted'
    return { ok: false, error: humane(error), timeUp }
  }
  return { ok: true, result: null }
}

/** The server's clock, for spotting a page restored from the browser's cache (compared with a 10s tolerance). */
export async function serverNow(): Promise<string> {
  return new Date().toISOString()
}
