import Link from 'next/link'
import { BookOpen, ChevronRight } from 'lucide-react'
import type { TreeNode } from '@/lib/courses/tree'
import { Panel, Mono } from '@/components/surfaces'
import { ProgressBar } from '@/components/progress-bar'

/** A node of the syllabus tree (a subject, a section, a topic): its size and the person's progress. */
export function NodeCard({ href, node }: { href: string; node: TreeNode }) {
  const bookCount = node.books.length
  return (
    <Link href={href} className="focus-ring group rounded-panel">
      <Panel className="flex h-full flex-col gap-3 transition-colors group-hover:border-primary/40">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold">{node.name}</h3>
          <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden />
        </div>
        {node.description && <p className="text-sm text-muted-foreground">{node.description}</p>}
        <div className="mt-auto flex flex-col gap-2 pt-2">
          {node.lessonCount > 0 && (
            <ProgressBar value={node.doneCount} max={node.lessonCount} label={`${node.name}: notes read`} />
          )}
          <p className="flex flex-wrap gap-x-2 text-[13px] text-muted-foreground">
            {node.children.length > 0 && (
              <span>
                <Mono>{node.children.length}</Mono> {node.children.length === 1 ? 'section' : 'sections'}
              </span>
            )}
            <span>
              <Mono>
                {node.doneCount}/{node.lessonCount}
              </Mono>{' '}
              notes
            </span>
            {node.questionCount > 0 && (
              <span>
                · <Mono>{node.questionCount}</Mono> questions
              </span>
            )}
            {bookCount > 0 && (
              <span className="inline-flex items-center gap-1">
                · <BookOpen className="size-3.5" aria-hidden /> <Mono>{bookCount}</Mono> {bookCount === 1 ? 'book' : 'books'}
              </span>
            )}
          </p>
        </div>
      </Panel>
    </Link>
  )
}
