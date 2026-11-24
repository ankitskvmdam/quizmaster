import { ChevronRight } from 'lucide-react'
import type { ChapterView, SubjectView, SyllabusView, TopicView } from '@/lib/syllabus'
import { Badge } from '@/components/badge'
import { Mono, Panel, SoftPanel } from '@/components/surfaces'
import { cn } from '@/lib/utils'

const n = (v: number) => v.toLocaleString('en-IN')
const perPaper = (v: number) => (Math.round(v * 10) / 10).toLocaleString('en-IN', { maximumFractionDigits: 1 })

/** A thin decorative bar; the figure next to it carries the value. */
function Bar({ ratio, className }: { ratio: number; className?: string }) {
  return (
    <span aria-hidden className={cn('block h-1.5 overflow-hidden rounded-full bg-soft', className)}>
      <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.round(ratio * 100)}%` }} />
    </span>
  )
}

/** Every subject by average questions per paper, each linking to its section. */
export function SyllabusOverview({ view }: { view: SyllabusView }) {
  return (
    <Panel aria-labelledby="overview" className="mb-8">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="overview" className="text-lg font-semibold">
          Subjects by weight
        </h2>
        <p className="text-[13px] text-muted-foreground">Average questions per paper</p>
      </div>
      <ol className="flex flex-col gap-1">
        {view.subjects.map((s) => (
          <li key={s.key}>
            <a href={`#${s.anchor}`} className="focus-ring group -mx-2 flex flex-col gap-1.5 rounded-lg px-2 py-2 hover:bg-soft">
              <span className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 text-[15px] font-medium break-words group-hover:text-primary">{s.name}</span>
                <span className="shrink-0 text-[13px] text-muted-foreground">
                  <Mono className="text-foreground">{perPaper(s.perPaper)}</Mono> / paper
                </span>
              </span>
              <Bar ratio={s.weight} />
            </a>
          </li>
        ))}
      </ol>
      <p className="mt-4 flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
        <Badge tone="primary" dot>
          High priority
        </Badge>
        asked in at least half of the <Mono>{view.papers}</Mono> papers.
      </p>
    </Panel>
  )
}

function Chapter({ c, papers }: { c: ChapterView; papers: number }) {
  const high = c.priority === 'high'
  return (
    <li className={cn('px-4 py-4 sm:px-6', high && 'bg-[color-mix(in_oklab,var(--tint)_45%,transparent)] shadow-[inset_3px_0_0_var(--primary)]')}>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
        <h3 className="min-w-0 text-[15px] leading-snug font-semibold break-words">{c.name}</h3>
        {(high || !!c.bihar || c.mostlyCurrent) && (
          <div className="flex flex-wrap gap-1.5">
            {high && (
              <Badge tone="primary" dot>
                High priority
              </Badge>
            )}
            {!!c.bihar && <Badge>Bihar</Badge>}
            {c.mostlyCurrent && <Badge>Current affairs</Badge>}
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-muted-foreground">
        <span>
          Asked in <Mono className="text-foreground">{c.papers}</Mono> of <Mono>{papers}</Mono> papers
        </span>
        <Bar ratio={c.share} className="w-16" />
        <span>
          <Mono className="text-foreground">{n(c.questions)}</Mono> {c.questions === 1 ? 'question' : 'questions'}
        </span>
      </div>
      {c.learn.length > 0 && (
        <ul className="mt-2.5 list-disc space-y-1 pl-5 text-sm leading-relaxed marker:text-muted-foreground">
          {c.learn.map((point, i) => (
            <li key={i}>{point}</li>
          ))}
        </ul>
      )}
      {c.note && <SoftPanel className="mt-2.5 px-3 py-2 text-[13px] leading-relaxed text-muted-foreground">{c.note}</SoftPanel>}
    </li>
  )
}

function Topic({ t, papers, open }: { t: TopicView; papers: number; open: boolean }) {
  return (
    <details id={t.anchor} open={open} className="group scroll-mt-4 rounded-panel border border-hairline bg-panel shadow-panel">
      <summary className="focus-ring flex cursor-pointer list-none items-center gap-3 rounded-panel px-4 py-3.5 sm:px-6 [&::-webkit-details-marker]:hidden">
        <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground group-open:rotate-90" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-semibold break-words">{t.name}</span>
          <span className="text-[13px] text-muted-foreground">
            <Mono>{t.chapters.length}</Mono> {t.chapters.length === 1 ? 'chapter' : 'chapters'} · <Mono>{n(t.questions)}</Mono>{' '}
            {t.questions === 1 ? 'question' : 'questions'}
          </span>
        </span>
        {t.highCount > 0 && (
          <Badge tone="primary" className="shrink-0">
            <Mono>{t.highCount}</Mono> high
          </Badge>
        )}
      </summary>
      <ol className="overflow-hidden rounded-b-panel border-t border-hairline [&>li+li]:border-t [&>li+li]:border-hairline">
        {t.chapters.map((c, i) => (
          <Chapter key={`${i}-${c.name}`} c={c} papers={papers} />
        ))}
      </ol>
    </details>
  )
}

function Subject({ s, papers }: { s: SubjectView; papers: number }) {
  return (
    <section id={s.anchor} aria-labelledby={`${s.anchor}-h`} className="scroll-mt-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id={`${s.anchor}-h`} className="text-lg font-semibold">
          {s.name}
        </h2>
        <p className="text-[13px] text-muted-foreground">
          <Mono className="text-foreground">{perPaper(s.perPaper)}</Mono> per paper · <Mono>{n(s.questions)}</Mono> questions
        </p>
      </div>
      {s.topics.length === 0 ? (
        <p className="text-sm text-muted-foreground">No chapters listed yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {s.topics.map((t, i) => (
            <Topic key={t.key} t={t} papers={papers} open={i === 0} />
          ))}
        </div>
      )}
    </section>
  )
}

/** Subject → topic → chapter, each topic collapsible; only the heaviest topic of a subject starts open, so the page stays scannable. */
export function SyllabusSubjects({ view }: { view: SyllabusView }) {
  return (
    <div className="flex flex-col gap-10">
      {view.subjects.map((s) => (
        <Subject key={s.key} s={s} papers={view.papers} />
      ))}
    </div>
  )
}
