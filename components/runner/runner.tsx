'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ListOrdered, LogOut, Send } from 'lucide-react'
import type { AttemptPayload, QuestionResult } from '@/lib/runner/types'
import { paletteCounts } from '@/lib/runner/palette'
import { remainingSeconds, timerAnnouncement } from '@/lib/runner/timer'
import { formatMinutes } from '@/lib/format'
import { saveAnswer, submitAttempt } from '@/app/attempt/[id]/actions'
import { GlowBackdrop } from '@/components/glow-backdrop'
import { Panel } from '@/components/surfaces'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { TopBar } from './top-bar'
import { QuestionView } from './question-view'
import { Palette } from './palette'

type QState = { selected: string | null; marked: boolean; result: QuestionResult | null; visited: boolean }

export function Runner({ initial }: { initial: AttemptPayload }) {
  const { attempt, test, questions } = initial
  const mode = attempt.mode
  const router = useRouter()

  const [states, setStates] = useState<QState[]>(() =>
    questions.map((q, i) => ({
      selected: q.selected_key,
      marked: q.marked,
      result: q.result,
      visited: i === 0 || q.selected_key !== null || q.marked,
    })),
  )
  const firstOpen = Math.max(0, states.findIndex((s) => !s.selected && !s.result))
  const [current, setCurrent] = useState(firstOpen)
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [dialog, setDialog] = useState<'submit' | 'leave' | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, startSubmit] = useTransition()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const submittedRef = useRef(false)

  // ---- Clock: server time + browser elapsed, so a wrong browser clock doesn't matter.
  const loadedAt = useRef<number | null>(null)
  const clock = useCallback(() => {
    const now = Date.now()
    loadedAt.current ??= now
    if (mode === 'timed' && attempt.deadline_at) {
      return remainingSeconds(attempt.deadline_at, initial.server_now, loadedAt.current, now)
    }
    const serverNow = Date.parse(initial.server_now) + (now - loadedAt.current)
    return Math.max(0, Math.round((serverNow - Date.parse(attempt.started_at)) / 1000))
  }, [mode, attempt.deadline_at, attempt.started_at, initial.server_now])
  // null until the first tick, so a resumed test never flashes its full duration.
  const [seconds, setSeconds] = useState<number | null>(null)
  const [announcement, setAnnouncement] = useState('')

  const doSubmit = useCallback(() => {
    if (submittedRef.current) return
    submittedRef.current = true
    setSubmitError(null)
    startSubmit(async () => {
      const r = await submitAttempt(attempt.id)
      if (r?.error) {
        submittedRef.current = false
        setSubmitError(r.error)
      }
    })
  }, [attempt.id])

  useEffect(() => {
    let prev = Number.POSITIVE_INFINITY
    const tick = () => {
      const s = clock()
      setSeconds(s)
      if (mode === 'timed') {
        const a = prev === Number.POSITIVE_INFINITY ? null : timerAnnouncement(prev, s)
        if (a) setAnnouncement(a)
        if (s <= 0) doSubmit()
      }
      prev = s
    }
    const first = setTimeout(tick, 0)
    const t = setInterval(tick, 1000)
    return () => {
      clearTimeout(first)
      clearInterval(t)
    }
  }, [clock, mode, doSubmit])

  // ---- Ask before leaving with the attempt open.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (submittedRef.current) return
      e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  const update = (i: number, patch: Partial<QState>) =>
    setStates((prev) => prev.map((s, j) => (j === i ? { ...s, ...patch } : s)))

  const go = useCallback(
    (i: number) => {
      if (i < 0 || i >= questions.length) return
      setError(null)
      setCurrent(i)
      setStates((prev) => prev.map((s, j) => (j === i ? { ...s, visited: true } : s)))
      setPaletteOpen(false)
      window.scrollTo({ top: 0 })
    },
    [questions.length],
  )

  /** Saves optimistically; on failure restores what was there and says why. */
  async function persist(i: number, next: { selected: string | null; marked: boolean }) {
    const before = states[i]
    update(i, next)
    setError(null)
    const r = await saveAnswer(attempt.id, questions[i].id, next.selected, next.marked)
    if (!r.ok) {
      update(i, { selected: before.selected, marked: before.marked })
      setError(r.error)
      if (r.timeUp) doSubmit()
    }
    return r
  }

  const q = states[current]

  function select(key: string) {
    if (q.result) return
    if (mode === 'practice') update(current, { selected: key }) // saved when checked
    else void persist(current, { selected: key, marked: q.marked })
  }

  function toggleMark() {
    if (q.result) return
    const marked = !q.marked
    if (mode === 'practice') {
      update(current, { marked })
      void saveAnswer(attempt.id, questions[current].id, null, marked)
    } else {
      void persist(current, { selected: q.selected, marked })
    }
  }

  async function check() {
    if (!q.selected || checking) return
    setChecking(true)
    setError(null)
    const r = await saveAnswer(attempt.id, questions[current].id, q.selected, q.marked)
    setChecking(false)
    if (!r.ok) {
      setError(r.error)
      return
    }
    update(current, { result: r.result })
  }

  // ---- Keyboard: 1–6 / A–F choose, N/P next and previous, M mark. Never required.
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {})
  useEffect(() => {
    keyRef.current = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (e.metaKey || e.ctrlKey || e.altKey || dialog || paletteOpen) return
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      const k = e.key.toLowerCase()
      const opts = questions[current].options
      const byNumber = /^[1-6]$/.test(k) ? opts[Number(k) - 1] : undefined
      const byLetter = /^[a-f]$/.test(k) ? opts.find((o) => o.key.toLowerCase() === k) : undefined
      if (byNumber || byLetter) {
        e.preventDefault()
        select((byNumber ?? byLetter)!.key)
      } else if (k === 'n') go(current + 1)
      else if (k === 'p') go(current - 1)
      else if (k === 'm') toggleMark()
    }
  })
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyRef.current(e)
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const counts = paletteCounts(states)
  const paletteItems = states
  const isLast = current === questions.length - 1

  const palette = <Palette items={paletteItems} current={current} onJump={go} />

  return (
    <div className="isolate min-h-dvh">
      <GlowBackdrop still />
      <TopBar
        title={test.title}
        mode={mode}
        seconds={seconds}
        isLast={isLast}
        onLeave={() => setDialog('leave')}
        onSubmit={() => setDialog('submit')}
      />
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      <div className="mx-auto grid max-w-[72rem] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="mx-auto w-full max-w-[70ch] lg:mx-0">
          <div className="mb-4 flex justify-end lg:hidden">
            <Sheet open={paletteOpen} onOpenChange={setPaletteOpen}>
              <SheetTrigger asChild>
                <Button variant="secondary" size="sm">
                  <ListOrdered />
                  Questions
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="px-5 pt-5 pb-8">
                <SheetHeader className="p-0">
                  <SheetTitle>Questions</SheetTitle>
                </SheetHeader>
                {palette}
              </SheetContent>
            </Sheet>
          </div>
          <Panel>
            <QuestionView
              key={current}
              question={questions[current]}
              index={current}
              total={questions.length}
              mode={mode}
              selected={q.selected}
              marked={q.marked}
              result={q.result}
              checking={checking}
              error={error}
              isLast={isLast}
              onSelect={select}
              onToggleMark={toggleMark}
              onClear={() => void persist(current, { selected: null, marked: q.marked })}
              onCheck={check}
              onPrev={() => go(current - 1)}
              onNext={() => go(current + 1)}
              onSubmit={() => setDialog('submit')}
            />
          </Panel>
          <p className="mt-4 hidden text-center text-[12px] text-muted-foreground sm:block">
            Keys: <kbd className="figures">1</kbd>–<kbd className="figures">{questions[current].options.length}</kbd> choose ·{' '}
            <kbd className="figures">N</kbd> next · <kbd className="figures">P</kbd> previous · <kbd className="figures">M</kbd> mark
          </p>
        </div>
        <aside className="hidden lg:block">
          <Panel className="sticky top-24">{palette}</Panel>
        </aside>
      </div>

      <ConfirmDialog
        open={dialog === 'submit' || (submitting && dialog !== 'leave')}
        onOpenChange={(o) => setDialog(o ? 'submit' : null)}
        icon={<Send />}
        title={`Submit ${test.title}?`}
        description={
          counts.unanswered > 0
            ? `You've answered ${counts.answered} of ${questions.length}; ${counts.unanswered} ${counts.unanswered === 1 ? 'is' : 'are'} unanswered. You can't change answers after submitting.`
            : `You've answered all ${questions.length} questions. You can't change answers after submitting.`
        }
        confirmLabel="Submit test"
        pending={submitting}
        error={submitError}
        onConfirm={doSubmit}
      />
      <ConfirmDialog
        open={dialog === 'leave'}
        onOpenChange={(o) => setDialog(o ? 'leave' : null)}
        tone="warning"
        icon={<LogOut />}
        title={`Leave ${test.title}?`}
        description={
          mode === 'timed'
            ? `Your answers are saved, but the clock keeps running${test.duration_sec ? ` (${formatMinutes(test.duration_sec)} in total)` : ''}. You can resume from Study until time is up.`
            : 'Your answers are saved. You can resume this practice from Study.'
        }
        cancelLabel="Keep going"
        confirmLabel="Leave test"
        onConfirm={() => {
          submittedRef.current = true // no beforeunload prompt for a deliberate leave
          router.push('/study')
        }}
      />
    </div>
  )
}
