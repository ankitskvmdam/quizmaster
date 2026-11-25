'use client'

import type { KeyboardEvent } from 'react'
import { ArrowLeft, ArrowRight, Flag, RotateCcw } from 'lucide-react'
import type { AttemptQuestion, QuestionResult } from '@/lib/runner/types'
import { Markdown } from '@/components/markdown'
import { Eyebrow, Mono, SoftPanel } from '@/components/surfaces'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/loading'
import { OptionCard, type OptionLook } from './option-card'
import { textLang } from '@/lib/lang'

function optionLook(key: string, selected: string | null, result: QuestionResult | null): { look: OptionLook; label?: string } {
  if (!result) return { look: key === selected ? 'selected' : 'idle' }
  if (key === result.correct_key) return { look: 'correct', label: key === selected ? 'Your answer · correct' : 'Correct answer' }
  if (key === selected) return { look: 'wrong', label: 'Your answer' }
  return { look: 'dimmed' }
}

export function QuestionView({
  question,
  index,
  total,
  mode,
  selected,
  marked,
  result,
  checking,
  error,
  isLast,
  onSelect,
  onToggleMark,
  onClear,
  onCheck,
  onPrev,
  onNext,
  onSubmit,
}: {
  question: AttemptQuestion
  index: number
  total: number
  mode: 'timed' | 'practice'
  selected: string | null
  marked: boolean
  result: QuestionResult | null
  checking: boolean
  error: string | null
  isLast: boolean
  onSelect: (key: string) => void
  onToggleMark: () => void
  onClear: () => void
  onCheck: () => void
  onPrev: () => void
  onNext: () => void
  onSubmit: () => void
}) {
  const locked = Boolean(result)
  const keys = question.options.map((o) => o.key)
  const focusKey = selected ?? keys[0]

  function onRadioKey(e: KeyboardEvent<HTMLDivElement>) {
    if (locked) return
    const dir = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0
    if (!dir) return
    e.preventDefault()
    const i = keys.indexOf(focusKey)
    const next = keys[(i + dir + keys.length) % keys.length]
    onSelect(next)
    e.currentTarget.querySelector<HTMLButtonElement>(`[data-option="${next}"]`)?.focus()
  }

  return (
    <section aria-labelledby="question-heading" className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Eyebrow id="question-heading">
          Question <Mono>{index + 1}</Mono> of <Mono>{total}</Mono> ·{' '}
          <span lang={textLang(question.topic_name)}>{question.topic_name}</span>
        </Eyebrow>
        <Markdown variant="question" source={question.stem_md} />
      </div>

      <div role="radiogroup" aria-labelledby="question-heading" onKeyDown={onRadioKey} className="flex flex-col gap-2.5">
        {question.options.map((o) => {
          const { look, label } = optionLook(o.key, selected, result)
          return (
            <OptionCard
              key={o.key}
              option={o}
              look={look}
              checked={o.key === selected}
              label={label}
              disabled={locked}
              tabIndex={o.key === focusKey ? 0 : -1}
              onSelect={() => onSelect(o.key)}
            />
          )
        })}
      </div>

      {error && (
        <p role="alert" className="text-sm text-wrong-fg">
          {error}
        </p>
      )}

      {result && (
        <SoftPanel className="flex flex-col gap-2" aria-live="polite">
          <p className={result.is_correct ? 'font-semibold text-correct-fg' : 'font-semibold text-wrong-fg'}>
            {result.is_correct ? 'Correct.' : `Not quite. The answer is ${result.correct_key}.`}
          </p>
          <Eyebrow>Explanation</Eyebrow>
          <Markdown variant="explanation" source={result.explanation_md} />
        </SoftPanel>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-5">
        <div className="flex flex-wrap gap-1">
          <Button variant="ghost" size="sm" aria-pressed={marked} onClick={onToggleMark}>
            <Flag className={marked ? 'fill-current text-review-fg' : undefined} />
            {marked ? 'Marked for review' : 'Mark for review'}
          </Button>
          {mode === 'timed' && selected && (
            <Button variant="ghost" size="sm" onClick={onClear}>
              <RotateCcw />
              Clear
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onPrev} disabled={index === 0}>
            <ArrowLeft />
            Previous
          </Button>
          {mode === 'practice' && !result ? (
            <Button onClick={onCheck} disabled={!selected || checking} aria-busy={checking || undefined}>
              {checking && <Spinner />}
              Check
            </Button>
          ) : isLast ? (
            <Button onClick={onSubmit}>Finish and submit</Button>
          ) : (
            <Button onClick={onNext}>
              Next
              <ArrowRight />
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}
