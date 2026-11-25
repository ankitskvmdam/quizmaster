'use client'

import { useActionState, useId, useMemo, useState } from 'react'
import { Check, ChevronRight, Copy, Pencil, Plus, Trash2 } from 'lucide-react'
import { createBuiltTest, type ActionResult } from '@/app/(app)/actions'
import type { BuilderCourse, BuilderSubject } from '@/lib/queries/home'
import { BUILT_MAX, BUILT_MIN, MAX_SECTIONS, defaultMinutes, splitCount } from '@/lib/builder'
import { textLang } from '@/lib/lang'
import { SegmentedControl } from '@/components/segmented-control'
import { SubmitButton } from '@/components/submit-button'
import { FormError } from '@/components/auth-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mono, Panel } from '@/components/surfaces'
import { cn } from '@/lib/utils'

type Mode = 'practice' | 'timed'
type Section = { key: number; subjectId: string; chapters: string[] }
type Subject = BuilderSubject & { label: string }

const PRESETS = [10, 20, 50, 100]
const KIND_WORD = { book: 'Book summary', topic: 'Topic-wise notes', monthly: 'Month' } as const

/** Questions in a section: the sum over its chapters (a chapter belongs to one book, so nothing is counted twice). */
function available(subject: Subject | undefined, chapters: string[]) {
  if (!subject) return 0
  const picked = new Set(chapters)
  return subject.books.flatMap((b) => b.chapters).reduce((n, c) => n + (picked.has(c.id) ? c.questionCount : 0), 0)
}

function SectionEditor({
  index,
  section,
  subjects,
  onChange,
}: {
  index: number
  section: Section
  subjects: Subject[]
  onChange: (s: Section) => void
}) {
  const selectId = useId()
  const subject = subjects.find((s) => s.id === section.subjectId)
  const picked = new Set(section.chapters)
  const allIds = subject?.books.flatMap((b) => b.chapters.map((c) => c.id)) ?? []
  const setPicked = (ids: string[], on: boolean) => {
    const next = new Set(picked)
    for (const id of ids) {
      if (on) next.add(id)
      else next.delete(id)
    }
    onChange({ ...section, chapters: allIds.filter((id) => next.has(id)) })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={selectId}>Subject</Label>
        <select
          id={selectId}
          value={section.subjectId}
          onChange={(e) => onChange({ ...section, subjectId: e.target.value, chapters: [] })}
          className="focus-ring h-11 w-full rounded-lg border border-hairline bg-panel px-3 text-[15px]"
        >
          <option value="">Choose a subject…</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {subject && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">Topics</span>
            <button
              type="button"
              onClick={() => setPicked(allIds, picked.size !== allIds.length)}
              className="focus-ring rounded-md px-1 text-[13px] font-medium text-primary hover:underline"
            >
              {picked.size === allIds.length ? 'Clear all' : `Pick all ${allIds.length}`}
            </button>
          </div>
          {subject.books.map((b) => {
            const ids = b.chapters.map((c) => c.id)
            const chosen = ids.filter((id) => picked.has(id)).length
            return (
              <details key={b.id} open={subject.books.length === 1} className="group rounded-panel border border-hairline">
                <summary className="focus-ring flex cursor-pointer list-none items-center gap-3 rounded-panel px-3 py-2.5 [&::-webkit-details-marker]:hidden">
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground group-open:rotate-90" aria-hidden />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-medium break-words" lang={textLang(b.title)}>
                      {b.title}
                    </span>
                    <span className="text-[13px] text-muted-foreground">
                      {KIND_WORD[b.kind]} · <Mono className={cn(chosen > 0 && 'text-foreground')}>{chosen}</Mono>/<Mono>{ids.length}</Mono> picked
                    </span>
                  </span>
                </summary>
                <div className="flex flex-col border-t border-hairline px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setPicked(ids, chosen !== ids.length)}
                    className="focus-ring mb-1 self-start rounded-md px-1 text-[13px] font-medium text-primary hover:underline"
                  >
                    {chosen === ids.length ? 'Clear these' : 'Pick all in this'}
                  </button>
                  {b.chapters.map((c) => {
                    const on = picked.has(c.id)
                    return (
                      <label key={c.id} className="flex cursor-pointer items-start gap-3 rounded-lg px-1 py-1.5 hover:bg-soft has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring">
                        <input type="checkbox" checked={on} onChange={() => setPicked([c.id], !on)} className="mt-1 size-4 shrink-0 accent-[var(--primary)]" />
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
      )}
      <span className="sr-only">Section {index + 1}</span>
    </div>
  )
}

/**
 * Build a test in sections, like the steps of a funnel: each section is a subject and some of its topics; "Add a
 * section" adds the next (up to ten). The question count is split evenly across the sections.
 */
export function BuildTest({ courses }: { courses: BuilderCourse[] }) {
  const [state, action] = useActionState<ActionResult, FormData>(createBuiltTest, undefined)
  const subjects: Subject[] = useMemo(
    () => courses.flatMap((c) => c.subjects.map((s) => ({ ...s, label: `${c.name} › ${s.name}` }))),
    [courses],
  )
  const [sections, setSections] = useState<Section[]>([{ key: 1, subjectId: subjects.length === 1 ? subjects[0].id : '', chapters: [] }])
  const [open, setOpen] = useState(1) // key of the section being edited
  const [nextKey, setNextKey] = useState(2)
  const [count, setCount] = useState(20)
  const [countText, setCountText] = useState('20')
  const [mode, setMode] = useState<Mode>('practice')
  const [minutes, setMinutes] = useState<string | null>(null)
  const [title, setTitle] = useState('')

  const avail = sections.map((s) => available(subjects.find((x) => x.id === s.subjectId), s.chapters))
  const split = splitCount(count, avail)
  const total = split.reduce((a, b) => a + b, 0)
  const ready = sections.every((s) => s.chapters.length > 0)

  const update = (key: number, s: Section) => setSections((all) => all.map((x) => (x.key === key ? s : x)))
  const add = (copyOf?: Section) => {
    if (sections.length >= MAX_SECTIONS) return
    const s = { key: nextKey, subjectId: copyOf?.subjectId ?? '', chapters: copyOf ? [...copyOf.chapters] : [] }
    setSections((all) => [...all, s])
    setOpen(nextKey)
    setNextKey((k) => k + 1)
  }
  const remove = (key: number) => {
    const rest = sections.filter((s) => s.key !== key)
    setSections(rest)
    if (open === key) setOpen(rest[rest.length - 1]?.key ?? 0)
  }
  const setCountFrom = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '').slice(0, 3)
    setCountText(digits)
    const n = Number(digits)
    if (n >= BUILT_MIN && n <= BUILT_MAX) setCount(n)
  }

  return (
    <form action={action} className="flex flex-col gap-6">
      <FormError message={state?.error} />
      <input type="hidden" name="sections" value={JSON.stringify(sections.map((s) => s.chapters))} />
      <input type="hidden" name="count" value={count} />

      <ol className="flex flex-col gap-3">
        {sections.map((s, i) => {
          const subject = subjects.find((x) => x.id === s.subjectId)
          const editing = s.key === open
          return (
            <li key={s.key}>
              <Panel className={cn('flex flex-col gap-4', editing && 'border-primary/50')}>
                <div className="flex items-start gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-tint text-[13px] font-semibold text-tint-foreground">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">Section {i + 1}</p>
                    {!editing && (
                      <p className="text-[13px] text-muted-foreground">
                        {subject ? (
                          <>
                            <span lang={textLang(subject.label)}>{subject.label}</span> · <Mono>{s.chapters.length}</Mono>{' '}
                            {s.chapters.length === 1 ? 'topic' : 'topics'}
                          </>
                        ) : (
                          'No subject yet'
                        )}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {!editing && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(s.key)} aria-label={`Edit section ${i + 1}`}>
                        <Pencil />
                      </Button>
                    )}
                    {sections.length < MAX_SECTIONS && s.subjectId && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => add(s)} aria-label={`Copy section ${i + 1}`}>
                        <Copy />
                      </Button>
                    )}
                    {sections.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => remove(s.key)} aria-label={`Remove section ${i + 1}`}>
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                </div>
                {editing && <SectionEditor index={i} section={s} subjects={subjects} onChange={(x) => update(s.key, x)} />}
                {s.chapters.length > 0 && (
                  <p className="text-[13px] text-muted-foreground">
                    <Mono className="text-foreground">{avail[i]}</Mono> questions to draw from · this section gets{' '}
                    <Mono className="text-foreground">{split[i]}</Mono>
                  </p>
                )}
              </Panel>
            </li>
          )
        })}
      </ol>

      <div className="flex items-center gap-3">
        <Button type="button" variant="secondary" onClick={() => add()} disabled={sections.length >= MAX_SECTIONS}>
          <Plus />
          Add a section
        </Button>
        <span className="text-[13px] text-muted-foreground">
          <Mono>{sections.length}</Mono>/<Mono>{MAX_SECTIONS}</Mono> sections
        </span>
      </div>

      <Panel className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium">Number of questions</span>
          <div className="flex flex-wrap items-center gap-2">
            {PRESETS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCountFrom(String(n))}
                aria-pressed={count === n}
                className={cn(
                  'focus-ring h-10 min-w-12 rounded-full border px-4 text-sm font-medium',
                  count === n ? 'border-primary bg-tint text-tint-foreground' : 'border-hairline bg-panel hover:bg-soft',
                )}
              >
                {n}
              </button>
            ))}
            <Input
              aria-label={`Any number from ${BUILT_MIN} to ${BUILT_MAX}`}
              inputMode="numeric"
              className="figures h-10 w-24"
              value={countText}
              onChange={(e) => setCountFrom(e.target.value)}
            />
          </div>
          <p className="text-[13px] text-muted-foreground">
            Any number from <Mono>{BUILT_MIN}</Mono> to <Mono>{BUILT_MAX}</Mono>, split as evenly as the sections allow.
            {ready && total < count && (
              <span className="block text-review-fg">
                Your topics have <Mono>{total}</Mono> questions, so the test will have <Mono>{total}</Mono>.
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-x-10 gap-y-6">
          <div className="flex flex-col gap-3">
            <span className="text-sm font-medium">Mode</span>
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
          </div>
          {mode === 'timed' && (
            <div className="flex flex-col gap-3">
              <Label htmlFor="minutes">Minutes</Label>
              <Input
                id="minutes"
                name="minutes"
                inputMode="numeric"
                className="figures h-10 w-24"
                value={minutes ?? String(defaultMinutes(Math.min(count, total || count)))}
                onChange={(e) => setMinutes(e.target.value.replace(/[^0-9]/g, ''))}
              />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="title">Name (optional)</Label>
          <Input id="title" name="title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Modern history revision" />
        </div>
      </Panel>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton size="lg" disabled={!ready}>
          <Check />
          {mode === 'timed' ? 'Build and start the clock' : 'Build and start'}
        </SubmitButton>
        {!ready && <span className="text-[13px] text-muted-foreground">Pick at least one topic in every section.</span>}
      </div>
    </form>
  )
}
