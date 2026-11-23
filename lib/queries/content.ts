import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

function fail(what: string, error: { message: string } | null): never {
  throw new Error(`Could not load ${what}${error ? `: ${error.message}` : ''}`)
}

/** Lesson ids the signed-in user has marked done. RLS limits lesson_progress to the caller. */
export const getDoneLessonIds = cache(async (): Promise<Set<string>> => {
  const supabase = await createClient()
  const { data, error } = await supabase.from('lesson_progress').select('lesson_id')
  if (error) fail('progress', error)
  return new Set(data.map((r) => r.lesson_id))
})

export type SubjectCard = { slug: string; name: string; description: string; topicCount: number; lessonCount: number }

export async function listSubjects(): Promise<SubjectCard[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('subjects')
    .select('slug, name, description, topics(id, lessons(id))')
    .order('position')
  if (error) fail('subjects', error)
  return data.map((s) => ({
    slug: s.slug,
    name: s.name,
    description: s.description,
    topicCount: s.topics.length,
    lessonCount: s.topics.reduce((n, t) => n + t.lessons.length, 0),
  }))
}

export type TopicCard = {
  id: string
  slug: string
  name: string
  description: string
  lessonCount: number
  doneCount: number
  questionCount: number
  sectionId: string | null
}

export type SectionInfo = { id: string; slug: string; name: string; kind: 'topics' | 'current_affairs'; position: number }

export async function getSubject(slug: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('subjects')
    .select('id, slug, name, description, sections(id, slug, name, kind, position), topics(id, section_id, slug, name, description, position, lessons(id), questions(id, retired))')
    .eq('slug', slug)
    .maybeSingle()
  if (error) fail('subject', error)
  if (!data) return null
  const done = await getDoneLessonIds()
  const topics: TopicCard[] = [...data.topics]
    .sort((a, b) => a.position - b.position)
    .map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      description: t.description,
      lessonCount: t.lessons.length,
      doneCount: t.lessons.filter((l) => done.has(l.id)).length,
      questionCount: t.questions.filter((q) => !q.retired).length,
      sectionId: t.section_id,
    }))
  const sections: SectionInfo[] = [...data.sections].sort((a, b) => a.position - b.position)
  return { subject: { id: data.id, slug: data.slug, name: data.name, description: data.description }, topics, sections }
}

export async function getTopic(subjectSlug: string, topicSlug: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('topics')
    .select('id, slug, name, description, subjects!inner(slug, name), lessons(id, slug, title, position), questions(id)')
    .eq('slug', topicSlug)
    .eq('subjects.slug', subjectSlug)
    .maybeSingle()
  if (error) fail('topic', error)
  if (!data) return null
  const done = await getDoneLessonIds()
  return {
    topic: { id: data.id, slug: data.slug, name: data.name, description: data.description, questionCount: data.questions.length },
    subject: data.subjects,
    lessons: [...data.lessons]
      .sort((a, b) => a.position - b.position)
      .map((l) => ({ id: l.id, slug: l.slug, title: l.title, position: l.position, done: done.has(l.id) })),
  }
}

export async function getLesson(subjectSlug: string, topicSlug: string, lessonSlug: string) {
  const t = await getTopic(subjectSlug, topicSlug)
  if (!t) return null
  const i = t.lessons.findIndex((l) => l.slug === lessonSlug)
  if (i === -1) return null
  const supabase = await createClient()
  const { data, error } = await supabase.from('lessons').select('id, title, body_md').eq('id', t.lessons[i].id).single()
  if (error) fail('lesson', error)
  return {
    lesson: { ...data, number: i + 1 },
    topic: t.topic,
    subject: t.subject,
    done: t.lessons[i].done,
    prev: t.lessons[i - 1] ?? null,
    next: t.lessons[i + 1] ?? null,
    total: t.lessons.length,
  }
}
