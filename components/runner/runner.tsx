'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ListOrdered, LogOut, Send } from 'lucide-react'
import type { AttemptPayload, QuestionResult } from '@/lib/runner/types'
import { paletteCounts } from '@/lib/runner/palette'
import { isStalePayload, remainingSeconds, timerAnnouncement } from '@/lib/runner/timer'
import { callSafely, OFFLINE_MESSAGE } from '@/lib/runner/safe-call'
import { formatMinutes } from '@/lib/format'
import { saveAnswer, serverNow, setMarked, submitAttempt, type SaveResult } from '@/app/attempt/[id]/actions'
import { GlowBackdrop } from '@/components/glow-backdrop'
import { Panel } from '@/components/surfaces'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { TopBar } from './top-bar'
import { QuestionView } from './question-view'
import { Palette } from './palette'
import { LangToggle } from '@/components/lang-toggle'
import type { ContentLang } from '@/lib/lang'

type QState = { selected: string | null; marked: boolean; result: QuestionResult | null; visited: boolean }

export function Runner({ initial, lang }: { initial: AttemptPayload; lang: ContentLang }) {
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
      const r = await callSafely(() => submitAttempt(attempt.id), { error: OFFLINE_MESSAGE })
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

  // ---- A page restored from cache (Back button, sleeping tab) shows old answers and an old clock: reload it.
  useEffect(() => {
    const mountedAt = Date.now()
    const check = async () => {
      const now = await callSafely(serverNow, null)
      if (now && isStalePayload(initial.server_now, now, Date.now() - mountedAt)) router.refresh()
    }
    void check()
    const onShow = () => document.visibilityState === 'visible' && void check()
    document.addEventListener('visibilitychange', onShow)
    window.addEventListener('pageshow', onShow)
    return () => {
      document.removeEventListener('visibilitychange', onShow)
      window.removeEventListener('pageshow', onShow)
    }
  }, [initial.server_now, router])

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

const offline: SaveResult = { ok: false, error: OFFLINE_MESSAGE }

  /** Saves an answer optimistically; on failure puts back what was there (unless a newer choice replaced it) and says why. */
  async function persist(i: number, selected: string | null) {
    const before = states[i].selected
    update(i, { selected })
    setError(null)
    const r = await callSafely(() => saveAnswer(attempt.id, questions[i].id, selected, states[i].marked), offline)
    if (!r.ok) {
      setStates((prev) => prev.map((s, j) => (j === i && s.selected === selected ? { ...s, selected: before } : s)))
      setError(r.error)
      if (r.timeUp) doSubmit()
    }
  }

  const q = states[current]

  function select(key: string) {
    if (q.result) return
    if (mode === 'practice') update(current, { selected: key }) // saved when checked
    else void persist(current, key)
  }

  /** Marking is its own write: it never touches the saved answer, even from a stale tab. */
  async function toggleMark() {
    const i = current
    const marked = !states[i].marked
    update(i, { marked })
    setError(null)
    const r = await callSafely(() => setMarked(attempt.id, questions[i].id, marked), offline)
    if (!r.ok) {
      setStates((prev) => prev.map((s, j) => (j === i && s.marked === marked ? { ...s, marked: !marked } : s)))
      setError(r.error)
      if (r.timeUp) doSubmit()
    }
  }

  async function check() {
    if (!q.selected || checking) return
    setChecking(true)
    setError(null)
    const r = await callSafely(() => saveAnswer(attempt.id, questions[current].id, q.selected, q.marked), offline)
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
      else if (k === 'm') void toggleMark()
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
      <div className="mx-auto grid max-w-[72rem] gap-6 px-4 pt-5 pb-10 sm:px-6 sm:py-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="mx-auto w-full max-w-[70ch] lg:mx-0">
          {/* On phones the question is not a card: it uses the full width inside the page gutter. */}
          <Panel className="max-sm:rounded-none max-sm:border-0 max-sm:bg-transparent max-sm:p-0 max-sm:shadow-none">
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
              onClear={() => void persist(current, null)}
              onCheck={check}
              onPrev={() => go(current - 1)}
              onNext={() => go(current + 1)}
              onSubmit={() => setDialog('submit')}
            />
          </Panel>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 lg:hidden">
            <Sheet open={paletteOpen} onOpenChange={setPaletteOpen}>
              <SheetTrigger asChild>
                <Button variant="secondary" size="sm">
                  <ListOrdered />
                  Questions
                  <span className="figures text-muted-foreground" aria-hidden>
                    {current + 1}/{questions.length}
                  </span>
                  <span className="sr-only">, on question {current + 1} of {questions.length}</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[85dvh] px-5 pt-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
                <SheetHeader className="p-0">
                  <SheetTitle>Questions</SheetTitle>
                </SheetHeader>
                <Palette items={paletteItems} current={current} onJump={go} className="flex-1" />
              </SheetContent>
            </Sheet>
            <LangToggle lang={lang} />
          </div>
          <p className="mt-4 hidden text-center text-[12px] text-muted-foreground sm:block">
            Keys: <kbd className="figures">1</kbd>–<kbd className="figures">{questions[current].options.length}</kbd> choose ·{' '}
            <kbd className="figures">N</kbd> next · <kbd className="figures">P</kbd> previous · <kbd className="figures">M</kbd> mark
          </p>
        </div>
        {/* Desktop: the language switcher and the question list in the side column, which sticks below the top bar
            (64px bar + 24px gap) and is never taller than the viewport; the numbers scroll inside. */}
        <aside className="hidden lg:block">
          <div className="sticky top-22 flex max-h-[calc(100dvh-7rem)] flex-col gap-3">
            <LangToggle lang={lang} className="self-end" />
            <Panel className="flex min-h-0 flex-col">
              <Palette items={paletteItems} current={current} onJump={go} />
            </Panel>
          </div>
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
