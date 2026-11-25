'use client'

import { useActionState, useState } from 'react'
import { Check, ChevronRight } from 'lucide-react'
import { createCustomTest, type ActionResult } from '@/app/(app)/actions'
import type { BuilderBook, BuilderCourse, BuilderNode } from '@/lib/queries/home'
import { defaultMinutes } from '@/lib/builder'
import { textLang } from '@/lib/lang'
import { SegmentedControl } from '@/components/segmented-control'
import { SubmitButton } from '@/components/submit-button'
import { FormError } from '@/components/auth-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mono } from '@/components/surfaces'
import { cn } from '@/lib/utils'

type Count = '10' | '20' | '30'
type Mode = 'practice' | 'timed'

const SHELF: Record<BuilderBook['kind'], string> = { book: 'Book summary', topic: 'Topic-wise notes', monthly: 'Month' }

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 flex items-center gap-2 text-sm font-medium">
        <span className="grid size-6 place-items-center rounded-full bg-tint text-[12px] text-tint-foreground">{n}</span>
        {title}
      </legend>
      {children}
    </fieldset>
  )
}

/** A checkbox styled as a chip. */
function Chip({ name, value, on, onToggle, label, count }: { name: string; value: string; on: boolean; onToggle: () => void; label: string; count: number }) {
  return (
    <label
      lang={textLang(label)}
      className={cn(
        'flex min-h-9 cursor-pointer items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring',
        on ? 'border-primary bg-tint text-tint-foreground' : 'border-hairline bg-panel hover:bg-soft',
      )}
    >
      <input type="checkbox" name={name} value={value} checked={on} onChange={onToggle} className="sr-only" />
      {on && <Check className="size-3.5 shrink-0" aria-hidden />}
      <span>{label}</span>
      <Mono className="text-[12px] opacity-70">{count}</Mono>
    </label>
  )
}

/**
 * Three steps: a course; then what to practise in it (a whole subject or section, or single chapters of its books,
 * topics and months); then the length and mode. The test starts straight away.
 */
export function TestBuilder({ courses }: { courses: BuilderCourse[] }) {
  const [state, action] = useActionState<ActionResult, FormData>(createCustomTest, undefined)
  const [courseSlug, setCourseSlug] = useState(courses[0]?.slug ?? '')
  const [nodes, setNodes] = useState<Set<string>>(new Set())
  const [chapters, setChapters] = useState<Set<string>>(new Set())
  const [count, setCount] = useState<Count>('10')
  const [mode, setMode] = useState<Mode>('practice')
  const [minutes, setMinutes] = useState<string | null>(null) // null = follow the default for the count

  const course = courses.find((c) => c.slug === courseSlug) ?? courses[0]
  const pickCourse = (slug: string) => {
    setCourseSlug(slug)
    setNodes(new Set())
    setChapters(new Set())
  }
  const flip = (set: Set<string>, ids: string[], on: boolean) => {
    const next = new Set(set)
    for (const id of ids) {
      if (on) next.add(id)
      else next.delete(id)
    }
    return next
  }
  const toggleNode = (id: string) => setNodes((s) => flip(s, [id], !s.has(id)))
  const toggleChapters = (ids: string[], on: boolean) => setChapters((s) => flip(s, ids, on))

  // An upper bound for the warning: a whole subject already contains its chapters, so this may count some twice.
  const allNodes: BuilderNode[] = course?.subjects.flatMap((s) => [s, ...s.sections]) ?? []
  const allChapters = course?.subjects.flatMap((s) => s.books.flatMap((b) => b.chapters)) ?? []
  const available =
    allNodes.filter((n) => nodes.has(n.id)).reduce((t, n) => t + n.questionCount, 0) +
    allChapters.filter((c) => chapters.has(c.id)).reduce((t, c) => t + c.questionCount, 0)
  const picked = nodes.size + chapters.size

  if (!course) return null
  return (
    <form action={action} className="flex flex-col gap-8">
      <FormError message={state?.error} />

      <Step n={1} title="Course">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Course">
          {courses.map((c) => {
            const on = c.slug === course.slug
            return (
              <label
                key={c.slug}
                lang={textLang(c.name)}
                className={cn(
                  'flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring',
                  on ? 'border-primary bg-tint text-tint-foreground' : 'border-hairline bg-panel hover:bg-soft',
                )}
              >
                <input type="radio" name="course" value={c.slug} checked={on} onChange={() => pickCourse(c.slug)} className="sr-only" />
                {on && <Check className="size-3.5" aria-hidden />}
                {c.name}
              </label>
            )
          })}
        </div>
      </Step>

      <Step n={2} title="Topics">
        <div className="flex flex-col gap-6">
          {course.subjects.map((s) => (
            <div key={s.id} className="flex flex-col gap-3">
              <h3 className="text-[15px] font-semibold" lang={textLang(s.name)}>
                {s.name}
              </h3>
              <div className="flex flex-wrap gap-2">
                <Chip name="topic" value={s.id} on={nodes.has(s.id)} onToggle={() => toggleNode(s.id)} label={`All of ${s.name}`} count={s.questionCount} />
                {s.sections
                  .filter((n) => n.questionCount !== s.questionCount)
                  .map((n) => (
                    <Chip key={n.id} name="topic" value={n.id} on={nodes.has(n.id)} onToggle={() => toggleNode(n.id)} label={n.name} count={n.questionCount} />
                  ))}
              </div>
              {s.books.map((b) => {
                const ids = b.chapters.map((c) => c.id)
                const chosen = ids.filter((id) => chapters.has(id)).length
                const all = chosen === ids.length
                return (
                  <details key={b.id} className="group rounded-panel border border-hairline bg-panel">
                    <summary className="focus-ring flex cursor-pointer list-none items-center gap-3 rounded-panel px-4 py-3 [&::-webkit-details-marker]:hidden">
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground group-open:rotate-90" aria-hidden />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="font-medium break-words" lang={textLang(b.title)}>
                          {b.title}
                        </span>
                        <span className="text-[13px] text-muted-foreground">
                          {SHELF[b.kind]} · <Mono>{ids.length}</Mono> {b.kind === 'book' ? 'chapters' : 'sections'}
                          {chosen > 0 && (
                            <>
                              {' '}
                              · <Mono className="text-foreground">{chosen}</Mono> picked
                            </>
                          )}
                        </span>
                      </span>
                    </summary>
                    <div className="flex flex-col gap-1 border-t border-hairline px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggleChapters(ids, !all)}
                        className="focus-ring mb-1 self-start rounded-md px-1 text-[13px] font-medium text-primary hover:underline"
                      >
                        {all ? 'Clear all' : 'Pick all'}
                      </button>
                      {b.chapters.map((c) => {
                        const on = chapters.has(c.id)
                        return (
                          <label key={c.id} className="flex cursor-pointer items-start gap-3 rounded-lg px-1 py-1.5 hover:bg-soft has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring">
                            <input
                              type="checkbox"
                              name="chapter"
                              value={c.id}
                              checked={on}
                              onChange={() => toggleChapters([c.id], !on)}
                              className="mt-1 size-4 shrink-0 accent-[var(--primary)]"
                            />
                            <Mono className="w-6 shrink-0 pt-0.5 text-[13px] text-muted-foreground">{String(c.number).padStart(2, '0')}</Mono>
                            <span className="min-w-0 flex-1 text-sm leading-relaxed break-words" lang={textLang(c.title)}>
                              {c.title}
                            </span>
                            <Mono className="shrink-0 pt-0.5 text-[12px] text-muted-foreground">{c.questionCount}</Mono>
                          </label>
                        )
                      })}
                    </div>
                  </details>
                )
              })}
            </div>
          ))}
        </div>
        {picked > 0 && available < Number(count) && (
          <p className="text-[13px] text-review-fg">
            What you picked has <Mono>{available}</Mono> questions, so the test will have <Mono>{available}</Mono>.
          </p>
        )}
      </Step>

      <Step n={3} title="Questions and mode">
        <div className="flex flex-wrap gap-x-10 gap-y-6">
          <SegmentedControl<Count>
            label="Number of questions"
            name="count"
            value={count}
            onChange={setCount}
            options={[
              { value: '10', label: '10' },
              { value: '20', label: '20' },
              { value: '30', label: '30' },
            ]}
          />
          <SegmentedControl<Mode>
            label="Mode"
            name="mode"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'practice', label: 'Practice' },
              { value: 'timed', label: 'Timed' },
            ]}
          />
          {mode === 'timed' && (
            <div className="flex items-center gap-3">
              <Label htmlFor="minutes">Minutes</Label>
              <Input
                id="minutes"
                name="minutes"
                inputMode="numeric"
                pattern="[0-9]*"
                className="figures h-10 w-24"
                value={minutes ?? String(defaultMinutes(Number(count)))}
                onChange={(e) => setMinutes(e.target.value.replace(/[^0-9]/g, ''))}
              />
            </div>
          )}
        </div>
      </Step>

      <div>
        <SubmitButton size="lg" disabled={picked === 0}>
          {mode === 'timed' ? 'Create and start the clock' : 'Create and start'}
        </SubmitButton>
      </div>
    </form>
  )
}

