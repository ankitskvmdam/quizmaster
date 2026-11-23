'use client'

import { useActionState, useState } from 'react'
import { Check } from 'lucide-react'
import { createCustomTest, type ActionResult } from '@/app/(app)/actions'
import type { BuilderTopic } from '@/lib/queries/home'
import { defaultMinutes } from '@/lib/builder'
import { SegmentedControl } from '@/components/segmented-control'
import { SubmitButton } from '@/components/submit-button'
import { FormError } from '@/components/auth-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mono } from '@/components/surfaces'
import { cn } from '@/lib/utils'

type Count = '10' | '20' | '30'
type Mode = 'practice' | 'timed'

/** Pick topics, a length and a mode; the test starts straight away. */
export function TestBuilder({ topics }: { topics: BuilderTopic[] }) {
  const [state, action] = useActionState<ActionResult, FormData>(createCustomTest, undefined)
  const [picked, setPicked] = useState<Set<string>>(() => new Set(topics.length === 1 ? [topics[0].id] : []))
  const [count, setCount] = useState<Count>('10')
  const [mode, setMode] = useState<Mode>('practice')
  const [minutes, setMinutes] = useState<string | null>(null) // null = follow the default for the count

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const available = topics.filter((t) => picked.has(t.id)).reduce((n, t) => n + t.questionCount, 0)

  return (
    <form action={action} className="flex flex-col gap-6">
      <FormError message={state?.error} />

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-sm font-medium">Topics</legend>
        <div className="flex flex-wrap gap-2">
          {topics.map((t) => {
            const on = picked.has(t.id)
            return (
              <label
                key={t.id}
                className={cn(
                  'flex h-9 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-sm transition-colors has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring',
                  on ? 'border-primary bg-tint text-tint-foreground' : 'border-hairline bg-panel hover:bg-soft',
                )}
              >
                <input type="checkbox" name="topic" value={t.id} checked={on} onChange={() => toggle(t.id)} className="sr-only" />
                {on && <Check className="size-3.5" aria-hidden />}
                {t.name}
                <Mono className="text-[12px] opacity-70">{t.questionCount}</Mono>
              </label>
            )
          })}
        </div>
        {picked.size > 0 && available < Number(count) && (
          <p className="text-[13px] text-review-fg">
            These topics have <Mono>{available}</Mono> questions, so the test will have <Mono>{available}</Mono>.
          </p>
        )}
      </fieldset>

      <div className="flex flex-wrap gap-x-10 gap-y-6">
        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium" id="count-label">
            Questions
          </span>
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
        </div>
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
              pattern="[0-9]*"
              className="figures h-10 w-24"
              value={minutes ?? String(defaultMinutes(Number(count)))}
              onChange={(e) => setMinutes(e.target.value.replace(/[^0-9]/g, ''))}
            />
          </div>
        )}
      </div>

      <div>
        <SubmitButton size="lg" disabled={picked.size === 0}>
          {mode === 'timed' ? 'Create and start the clock' : 'Create and start'}
        </SubmitButton>
      </div>
    </form>
  )
}
