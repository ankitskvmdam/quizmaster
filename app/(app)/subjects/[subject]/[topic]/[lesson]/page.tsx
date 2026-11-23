import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { getLesson } from '@/lib/queries/content'
import { GlowBackdrop } from '@/components/glow-backdrop'
import { Eyebrow, Mono } from '@/components/surfaces'
import { Markdown } from '@/components/markdown'
import { Button } from '@/components/ui/button'
import { MarkDone } from './mark-done'

type Props = PageProps<'/subjects/[subject]/[topic]/[lesson]'>

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params
  const data = await getLesson(p.subject, p.topic, p.lesson)
  return { title: data?.lesson.title ?? 'Lesson' }
}

export default async function LessonPage({ params }: Props) {
  const p = await params
  const data = await getLesson(p.subject, p.topic, p.lesson)
  if (!data) notFound()
  const { lesson, topic, subject, done, prev, next, total } = data
  const base = `/subjects/${subject.slug}/${topic.slug}`

  return (
    <article className="mx-auto max-w-[70ch]">
      <GlowBackdrop still />
      <header className="mb-8 flex flex-col gap-2">
        <Eyebrow>
          <Link href={`/subjects/${subject.slug}`} className="hover:underline">
            {subject.name}
          </Link>{' '}
          ·{' '}
          <Link href={base} className="hover:underline">
            {topic.name}
          </Link>{' '}
          · Lesson <Mono>{lesson.number}</Mono> of <Mono>{total}</Mono>
        </Eyebrow>
        <h1 className="text-[30px] leading-tight font-semibold tracking-tight">{lesson.title}</h1>
      </header>

      <Markdown source={lesson.body_md} />

      <footer className="mt-12 flex flex-col gap-6 border-t border-hairline pt-6">
        <MarkDone lessonId={lesson.id} done={done} />
        <nav aria-label="Lessons" className="flex flex-wrap justify-between gap-3">
          {prev ? (
            <Button variant="secondary" asChild>
              <Link href={`${base}/${prev.slug}`}>
                <ArrowLeft />
                {prev.title}
              </Link>
            </Button>
          ) : (
            <span />
          )}
          {next ? (
            <Button variant="secondary" asChild>
              <Link href={`${base}/${next.slug}`}>
                {next.title}
                <ArrowRight />
              </Link>
            </Button>
          ) : (
            <Button variant="secondary" asChild>
              <Link href={base}>
                Back to {topic.name}
                <ArrowRight />
              </Link>
            </Button>
          )}
        </nav>
      </footer>
    </article>
  )
}
