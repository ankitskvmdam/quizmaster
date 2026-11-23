import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, Dumbbell } from 'lucide-react'
import { getCategoryNotes } from '@/lib/queries/current-affairs'
import { formatMonth, isMonthKey } from '@/lib/periods'
import { startCaPractice } from '@/app/(app)/actions'
import { GlowBackdrop } from '@/components/glow-backdrop'
import { Eyebrow, Mono } from '@/components/surfaces'
import { NoteCard } from '@/components/ca/note-card'
import { ActionButton } from '@/components/action-button'
import { Button } from '@/components/ui/button'
import { MarkRead } from './mark-read'

type Props = PageProps<'/courses/[course]/current-affairs/[month]/[category]'>

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { course: subject, month, category } = await params
  const data = isMonthKey(month) ? await getCategoryNotes(subject, month, category) : null
  return { title: data ? `${data.category.name} · ${formatMonth(month)}` : 'Current affairs' }
}

export default async function CategoryNotesPage({ params }: Props) {
  const { course: subject, month, category } = await params
  if (!isMonthKey(month)) notFound()
  const data = await getCategoryNotes(subject, month, category)
  if (!data) notFound()
  const monthHref = `/courses/${subject}/current-affairs/${month}`

  return (
    <article className="mx-auto max-w-[70ch]">
      <GlowBackdrop still />
      <header className="mb-6 flex flex-col gap-2">
        <Eyebrow>
          <Link href={monthHref} className="hover:underline">
            {formatMonth(month)}
          </Link>{' '}
          · <Mono>{data.notes.length}</Mono> notes
        </Eyebrow>
        <h1 className="text-[30px] leading-tight font-semibold tracking-tight">{data.category.name}</h1>
      </header>

      <div className="flex flex-col gap-3">
        {data.notes.map((n) => (
          <NoteCard key={n.slug} note={n} />
        ))}
      </div>

      <footer className="mt-10 flex flex-col gap-6 border-t border-hairline pt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <MarkRead monthId={data.monthId} categorySlug={data.category.slug} read={data.read} />
          {data.questionCount > 0 && (
            <ActionButton action={startCaPractice.bind(null, { from: month, to: month, categories: [data.category.slug], count: 10 })}>
              <Dumbbell />
              Practice this category
            </ActionButton>
          )}
        </div>
        <nav aria-label="Categories" className="flex flex-wrap justify-between gap-3">
          {data.prev ? (
            <Button variant="secondary" asChild>
              <Link href={`${monthHref}/${data.prev.slug}`}>
                <ArrowLeft />
                {data.prev.name}
              </Link>
            </Button>
          ) : (
            <span />
          )}
          {data.next ? (
            <Button variant="secondary" asChild>
              <Link href={`${monthHref}/${data.next.slug}`}>
                {data.next.name}
                <ArrowRight />
              </Link>
            </Button>
          ) : (
            <Button variant="secondary" asChild>
              <Link href={monthHref}>
                Back to {formatMonth(month)}
                <ArrowRight />
              </Link>
            </Button>
          )}
        </nav>
      </footer>
    </article>
  )
}
