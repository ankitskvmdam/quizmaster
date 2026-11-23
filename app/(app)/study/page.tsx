import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense, type ReactNode } from 'react'
import { ArrowRight, BookOpen, Dumbbell, History, PartyPopper, Timer } from 'lucide-react'
import { getUser } from '@/lib/queries/user'
import { firstName } from '@/lib/names'
import { getContinue, getRecentAttempts, getTopicProgress } from '@/lib/queries/home'
import { startQuickPractice } from '@/app/(app)/actions'
import { formatPercent } from '@/lib/format'
import { Greeting } from '@/components/study/greeting'
import { Panel, IconTile, Eyebrow, Mono } from '@/components/surfaces'
import { ProgressBar } from '@/components/progress-bar'
import { EmptyState } from '@/components/empty-state'
import { Skeleton } from '@/components/loading'
import { SectionRetry } from '@/components/section-retry'
import { ActionButton } from '@/components/action-button'
import { AttemptList } from '@/components/tests/attempt-list'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Study' }

/** Each panel loads and fails on its own. */
function Section({ children, height = 'h-32' }: { children: ReactNode; height?: string }) {
  return <Suspense fallback={<Skeleton className={`${height} rounded-panel`} />}>{children}</Suspense>
}

async function safely<T>(load: () => Promise<T>): Promise<{ ok: true; data: T } | { ok: false }> {
  try {
    return { ok: true, data: await load() }
  } catch {
    return { ok: false }
  }
}

async function ContinuePanel() {
  const r = await safely(getContinue)
  if (!r.ok) return <Panel><SectionRetry /></Panel>
  const c = r.data
  if (!c) {
    return (
      <Panel className="flex items-center gap-4 border-transparent bg-tint">
        <IconTile size="lg" className="bg-panel">
          <PartyPopper />
        </IconTile>
        <div>
          <p className="font-semibold">You have read every lesson.</p>
          <p className="text-sm text-muted-foreground">Keep sharp with a mock test or a custom practice set.</p>
        </div>
      </Panel>
    )
  }
  const isAttempt = c.type === 'attempt'
  return (
    <Panel className="flex flex-col gap-5 border-transparent bg-tint sm:flex-row sm:items-center">
      <IconTile size="lg" className="bg-panel">
        {isAttempt ? <Timer /> : <BookOpen />}
      </IconTile>
      <div className="flex-1">
        <Eyebrow>{isAttempt ? (c.mode === 'timed' ? 'Timed test in progress' : 'Practice in progress') : c.first ? 'Start here' : 'Continue'}</Eyebrow>
        <p className="mt-1 text-xl font-semibold">{isAttempt ? c.testTitle : c.first ? `Start with ${c.topicName}` : c.title}</p>
        {!isAttempt && !c.first && <p className="text-sm text-muted-foreground">{c.topicName}</p>}
        {!isAttempt && c.first && <p className="text-sm text-muted-foreground">First lesson: {c.title}</p>}
      </div>
      <Button size="lg" asChild>
        <Link href={isAttempt ? `/attempt/${c.attemptId}` : c.href}>
          {isAttempt ? 'Resume test' : 'Continue lesson'}
          <ArrowRight />
        </Link>
      </Button>
    </Panel>
  )
}

async function ProgressPanel() {
  const r = await safely(getTopicProgress)
  return (
    <Panel className="flex h-full flex-col gap-4">
      <h2 className="text-lg font-semibold">Your progress</h2>
      {!r.ok ? (
        <SectionRetry />
      ) : r.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">Topics appear here as soon as material is added.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {r.data.map((t) => (
            <li key={t.topicId} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <Link href={t.href} className="focus-ring rounded font-medium hover:underline">
                  {t.name}
                </Link>
                <span className="text-[13px] text-muted-foreground">
                  <Mono>
                    {t.done}/{t.total}
                  </Mono>{' '}
                  lessons
                  {t.accuracy !== null && (
                    <>
                      {' '}
                      · <Mono className="text-foreground">{formatPercent(t.accuracy)}</Mono> right
                    </>
                  )}
                </span>
              </div>
              <ProgressBar value={t.done} max={t.total} label={`${t.name}: lessons done`} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

async function RecentPanel() {
  const r = await safely(() => getRecentAttempts(5))
  return (
    <Panel className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Recent attempts</h2>
        <Link href="/past" className="focus-ring rounded text-sm font-medium text-primary hover:underline">
          See all
        </Link>
      </div>
      {!r.ok ? (
        <SectionRetry />
      ) : r.data.length === 0 ? (
        <EmptyState
          icon={<History />}
          title="No attempts yet"
          action={
            <Button asChild variant="secondary">
              <Link href="/tests">Take your first test</Link>
            </Button>
          }
        >
          Your scores and reviews appear here.
        </EmptyState>
      ) : (
        <AttemptList rows={r.data} compact />
      )}
    </Panel>
  )
}

export default async function StudyPage() {
  const user = await getUser()
  return (
    <>
      <Greeting name={firstName(user.displayName)} />
      <div className="flex flex-col gap-4">
        <Section>
          <ContinuePanel />
        </Section>
        <div className="grid items-start gap-4 lg:grid-cols-[2fr_3fr]">
          <Section height="h-56">
            <ProgressPanel />
          </Section>
          <Section height="h-56">
            <RecentPanel />
          </Section>
        </div>
        <Panel className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <IconTile>
              <Dumbbell />
            </IconTile>
            <div>
              <h2 className="font-semibold">Quick practice</h2>
              <p className="text-sm text-muted-foreground">Ten untimed questions from the topics you have read.</p>
            </div>
          </div>
          <ActionButton variant="secondary" action={startQuickPractice}>
            Start quick practice
          </ActionButton>
        </Panel>
      </div>
    </>
  )
}
