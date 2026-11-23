import type { ReactNode } from 'react'
import type { TestRow } from '@/lib/queries/tests'
import { formatMarks, formatMinutes, formatScore } from '@/lib/format'
import { DataTable } from '@/components/data-table'
import { Mono } from '@/components/surfaces'
import { StartActions } from './start-actions'

function Marking({ t }: { t: TestRow }) {
  return (
    <Mono>
      {formatMarks(t.marksCorrect)} / {t.marksWrong < 0 ? formatMarks(t.marksWrong) : '0'}
    </Mono>
  )
}

function Best({ t }: { t: TestRow }) {
  return t.bestScore === null ? (
    <span className="text-muted-foreground">—</span>
  ) : (
    <Mono>
      {formatScore(t.bestScore)}
      <span className="text-muted-foreground">/{t.maxScore}</span>
    </Mono>
  )
}

/** Tests as a dense table from md up, and as stacked rows on phones. */
export function TestList({ tests, empty }: { tests: TestRow[]; empty: ReactNode }) {
  if (tests.length === 0) return <>{empty}</>
  const actions = (t: TestRow) => (
    <StartActions
      testId={t.id}
      title={t.title}
      questionCount={t.questionCount}
      durationSec={t.durationSec}
      marksCorrect={t.marksCorrect}
      marksWrong={t.marksWrong}
    />
  )
  return (
    <>
      <div className="hidden md:block">
        <DataTable>
          <thead>
            <tr>
              <th>Test</th>
              <th className="num">Questions</th>
              <th className="num">Time</th>
              <th className="num">Marking</th>
              <th className="num">Best</th>
              <th>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {tests.map((t) => (
              <tr key={t.id}>
                <td className="font-medium">{t.title}</td>
                <td className="num">{t.questionCount}</td>
                <td className="num">{t.durationSec ? formatMinutes(t.durationSec) : '—'}</td>
                <td className="num">
                  <Marking t={t} />
                </td>
                <td className="num">
                  <Best t={t} />
                </td>
                <td>{actions(t)}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </div>
      <ul className="-my-3 flex flex-col md:hidden">
        {tests.map((t, i) => (
          <li key={t.id} className={i > 0 ? 'border-t border-hairline py-4' : 'py-4'}>
            <p className="font-medium">{t.title}</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              <Mono>{t.questionCount}</Mono> questions · {t.durationSec ? <Mono>{formatMinutes(t.durationSec)}</Mono> : 'untimed'} ·{' '}
              <Marking t={t} /> · best <Best t={t} />
            </p>
            <div className="mt-3 [&>div]:justify-start">{actions(t)}</div>
          </li>
        ))}
      </ul>
    </>
  )
}
