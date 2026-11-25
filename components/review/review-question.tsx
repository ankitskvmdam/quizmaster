import { Check, Flag, X } from 'lucide-react'
import type { ReviewQuestion as Q } from '@/lib/runner/types'
import { Markdown } from '@/components/markdown'
import { Panel, Eyebrow, Mono, SoftPanel } from '@/components/surfaces'
import { Badge } from '@/components/badge'
import { cn } from '@/lib/utils'
import { textLang } from '@/lib/lang'

/** One reviewed question: your answer and the correct one, by icon and by word, then the explanation. */
export function ReviewQuestion({ q, number }: { q: Q; number: number }) {
  const status = q.selected_key === null ? 'skipped' : q.is_correct ? 'correct' : 'wrong'
  return (
    <Panel className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Eyebrow>
          Question <Mono>{number}</Mono> · <span lang={textLang(q.topic_name)}>{q.topic_name}</span>
        </Eyebrow>
        <div className="flex gap-1.5">
          {q.marked && (
            <Badge tone="review">
              <Flag className="size-3" aria-hidden />
              Marked
            </Badge>
          )}
          <Badge tone={status} dot>
            {status === 'correct' ? 'Correct' : status === 'wrong' ? 'Wrong' : 'Skipped'}
          </Badge>
        </div>
      </div>
      <Markdown variant="question" source={q.stem_md} />
      <ul className="flex flex-col gap-2">
        {q.options.map((o) => {
          const isCorrect = o.key === q.correct_key
          const isMine = o.key === q.selected_key
          const label = isCorrect && isMine ? 'Your answer · correct' : isCorrect ? 'Correct answer' : isMine ? 'Your answer' : null
          return (
            <li
              key={o.key}
              className={cn(
                'flex min-h-12 items-center gap-3 rounded-lg border px-3 py-2.5',
                isCorrect ? 'border-correct-border bg-correct' : isMine ? 'border-wrong-border bg-wrong' : 'border-hairline',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'figures inline-flex size-7 shrink-0 items-center justify-center rounded-md text-[12px] font-semibold',
                  isCorrect ? 'bg-correct-fg text-panel' : isMine ? 'bg-wrong-fg text-panel' : 'bg-soft text-muted-foreground',
                )}
              >
                {isCorrect ? <Check className="size-3.5" /> : isMine ? <X className="size-3.5" /> : o.key}
              </span>
              <span className="flex-1">
                <span className="sr-only">Option {o.key}: </span>
                <Markdown variant="option" source={o.text_md} />
              </span>
              {label && (
                <span className={cn('text-[12px] font-medium', isCorrect ? 'text-correct-fg' : 'text-wrong-fg')}>{label}</span>
              )}
            </li>
          )
        })}
      </ul>
      <SoftPanel className="flex flex-col gap-1.5">
        <Eyebrow>Explanation</Eyebrow>
        <Markdown variant="explanation" source={q.explanation_md} />
      </SoftPanel>
    </Panel>
  )
}
