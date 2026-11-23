import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Dumbbell } from 'lucide-react'
import { getPeriodNotes } from '@/lib/queries/current-affairs'
import { formatMonth, parsePeriod } from '@/lib/periods'
import { startCaPractice } from '@/app/(app)/actions'
import { GlowBackdrop } from '@/components/glow-backdrop'
import { Eyebrow, Mono } from '@/components/surfaces'
import { NoteCard } from '@/components/ca/note-card'
import { ActionButton } from '@/components/action-button'
import { Button } from '@/components/ui/button'

type Props = PageProps<'/subjects/[subject]/current-affairs/period/[category]'>

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { category } = await params
  const sp = await searchParams
  const p = parsePeriod(String(sp.from ?? ''), String(sp.to ?? ''))
  return { title: p ? `${category} · ${p.label}` : 'Current affairs' }
}

export default async function PeriodNotesPage({ params, searchParams }: Props) {
  const { subject, category } = await params
  const sp = await searchParams
  const period = parsePeriod(typeof sp.from === 'string' ? sp.from : undefined, typeof sp.to === 'string' ? sp.to : undefined)
  if (!period) notFound()
  const data = await getPeriodNotes(subject, period, category)
  if (!data) notFound()
  const periodHref = `/subjects/${subject}/current-affairs/period?from=${period.from}&to=${period.to}`
  const total = data.groups.reduce((n, g) => n + g.notes.length, 0)

  return (
    <article className="mx-auto max-w-[70ch]">
      <GlowBackdrop still />
      <header className="mb-6 flex flex-col gap-2">
        <Eyebrow>
          <Link href={periodHref} className="hover:underline">
            {period.label}
          </Link>{' '}
          · <Mono>{total}</Mono> notes
        </Eyebrow>
        <h1 className="text-[30px] leading-tight font-semibold tracking-tight">{data.category.name}</h1>
      </header>

      {data.groups.length === 0 ? (
        <p className="text-muted-foreground">No notes in this category for {period.label}.</p>
      ) : (
        <div className="flex flex-col gap-8">
          {data.groups.map((g) => (
            <section key={g.month} aria-labelledby={`m-${g.month}`} className="flex flex-col gap-3">
              <h2 id={`m-${g.month}`} className="text-lg font-semibold">
                {formatMonth(g.month)}
              </h2>
              {g.notes.map((n) => (
                <NoteCard key={`${g.month}-${n.slug}`} note={n} />
              ))}
            </section>
          ))}
        </div>
      )}

      <footer className="mt-10 flex flex-wrap justify-between gap-3 border-t border-hairline pt-6">
        <Button variant="secondary" asChild>
          <Link href={periodHref}>Back to {period.label}</Link>
        </Button>
        {data.questionCount > 0 && (
          <ActionButton action={startCaPractice.bind(null, { from: period.from, to: period.to, categories: [data.category.slug], count: 10 })}>
            <Dumbbell />
            Practice this category
          </ActionButton>
        )}
      </footer>
    </article>
  )
}
