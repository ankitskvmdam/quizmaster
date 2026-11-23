import Link from 'next/link'
import { ArrowLeft, ArrowRight, BookOpen, Check, Dumbbell, FileQuestion, Tag } from 'lucide-react'
import type { BookNode, RawChapter, RawLesson, TreeNode, Tree } from '@/lib/courses/tree'
import { formatScore } from '@/lib/format'
import { startTest, startTopicPractice } from '@/app/(app)/actions'
import { PageHeader } from '@/components/page-header'
import { GlowBackdrop } from '@/components/glow-backdrop'
import { Panel, IconTile, Eyebrow, Mono } from '@/components/surfaces'
import { EmptyState } from '@/components/empty-state'
import { Markdown } from '@/components/markdown'
import { ActionButton } from '@/components/action-button'
import { Badge } from '@/components/badge'
import { Button } from '@/components/ui/button'
import { NodeCard } from './node-card'
import { Breadcrumbs } from './crumbs'
import { MarkDone } from './mark-done'
import { MarkChapterRead } from './mark-chapter-read'
import { cn } from '@/lib/utils'

type Ctx = { courseSlug: string; courseName: string; tree: Tree }
const nodeHref = (ctx: Ctx, path: string) => `/courses/${ctx.courseSlug}/${path}`

/** Course · subject · … down to (but not including) the current page. */
function trail(ctx: Ctx, path: string | null, includeSelf = false) {
  const nodes = path ? [...ctx.tree.ancestors(path), ...(includeSelf ? [ctx.tree.byPath.get(path)!] : [])] : []
  return [{ href: `/courses/${ctx.courseSlug}`, label: ctx.courseName }, ...nodes.map((n) => ({ href: nodeHref(ctx, n.path), label: n.name }))]
}

// ---------------------------------------------------------------------------
// A node: books (on a subject) first, then its notes — note groups below it and its own notes — and practice over the whole branch
// ---------------------------------------------------------------------------
export function NodeView({ ctx, node }: { ctx: Ctx; node: TreeNode }) {
  // A section lists only its own notes. When it has none but book chapters cover it, it links to those books once
  // (not their chapter lists, which would duplicate the book).
  const hasOwn = node.children.length > 0 || node.lessons.length > 0 || node.books.length > 0
  const taggedBooks = [...new Map(node.taggedChapters.map((t) => [t.book.id, t])).values()].map((t) => ({
    book: t.book,
    subjectPath: t.subjectPath,
    count: node.taggedChapters.filter((x) => x.book.id === t.book.id).length,
  }))
  const onlyBooks = !hasOwn && taggedBooks.length > 0
  const empty = !hasOwn && !onlyBooks
  return (
    <>
      <Breadcrumbs items={trail(ctx, node.path)} current={node.name} />
      <PageHeader
        title={node.name}
        description={node.description || undefined}
        actions={
          node.questionCount > 0 ? (
            <ActionButton variant="secondary" action={startTopicPractice.bind(null, node.id)}>
              <Dumbbell />
              Practice {node.name}
            </ActionButton>
          ) : undefined
        }
      />
      <div className="flex flex-col gap-8">
        {empty && (
          <Panel>
            <EmptyState icon={<BookOpen />} title="Nothing here yet">
              Notes and questions for {node.name} appear here as soon as they are added.
            </EmptyState>
          </Panel>
        )}

        {onlyBooks && (
          // No notes of its own: point to the book(s) that cover it rather than repeating their chapters here.
          <Panel className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">{node.name} is covered in:</p>
            <ul className="flex flex-col gap-2">
              {taggedBooks.map(({ book, subjectPath, count }) => (
                <li key={book.id}>
                  <Link
                    href={`${nodeHref(ctx, subjectPath)}/books/${book.slug}`}
                    className="focus-ring -mx-2 flex items-center gap-3 rounded-lg px-2 py-2 font-medium hover:bg-soft"
                  >
                    <BookOpen className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="flex-1">{book.title}</span>
                    <span className="text-[13px] text-muted-foreground">
                      <Mono>{count}</Mono> {count === 1 ? 'chapter' : 'chapters'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        {node.books.length > 0 && (
          <section aria-labelledby="books">
            <h2 id="books" className="mb-3 text-lg font-semibold">
              Books
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {node.books.map((b) => (
                <Link key={b.id} href={`${nodeHref(ctx, node.path)}/books/${b.slug}`} className="focus-ring group rounded-panel">
                  <Panel className="flex h-full flex-col gap-3 transition-colors group-hover:border-primary/40">
                    <IconTile>
                      <BookOpen />
                    </IconTile>
                    <div>
                      <h3 className="text-lg font-semibold">{b.title}</h3>
                      {(b.author || b.edition) && (
                        <p className="text-sm text-muted-foreground">{[b.author, b.edition && `${b.edition} edition`].filter(Boolean).join(' · ')}</p>
                      )}
                    </div>
                    <p className="mt-auto text-[13px] text-muted-foreground">
                      <Mono>
                        {b.chaptersRead}/{b.chapters.length}
                      </Mono>{' '}
                      chapters read
                    </p>
                  </Panel>
                </Link>
              ))}
            </div>
          </section>
        )}
        {node.children.length > 0 && (
          <section aria-labelledby="sections">
            <h2 id="sections" className="mb-3 text-lg font-semibold">
              Notes
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {node.children.map((c) => (
                <NodeCard key={c.id} href={nodeHref(ctx, c.path)} node={c} />
              ))}
            </div>
          </section>
        )}

        {node.lessons.length > 0 && (
          <section aria-labelledby="lessons">
            <h2 id="lessons" className="mb-3 text-lg font-semibold">
              {node.children.length > 0 ? 'More notes' : 'Notes'}
            </h2>
            <Panel>
              <ol className="-my-2 flex flex-col">
                {node.lessons.map((l, i) => (
                  <li key={l.id} className={cn(i > 0 && 'border-t border-hairline')}>
                    <Link
                      href={`${nodeHref(ctx, node.path)}/${l.slug}`}
                      className="focus-ring -mx-2 flex items-center gap-4 rounded-lg px-2 py-3.5 hover:bg-soft"
                    >
                      <Mono className="w-6 text-sm text-muted-foreground">{String(i + 1).padStart(2, '0')}</Mono>
                      <span className="flex-1 font-medium">{l.title}</span>
                      {l.done && (
                        <span className="flex items-center gap-1 text-[13px] text-correct-fg">
                          <Check className="size-4" aria-hidden />
                          Done
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ol>
            </Panel>
          </section>
        )}

      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// A lesson
// ---------------------------------------------------------------------------
export function LessonView({
  ctx,
  node,
  lesson,
  body,
  prev,
  next,
}: {
  ctx: Ctx
  node: TreeNode
  lesson: RawLesson
  body: string
  prev: RawLesson | null
  next: RawLesson | null
}) {
  const base = nodeHref(ctx, node.path)
  return (
    <>
    <Breadcrumbs items={trail(ctx, node.path, true)} current={lesson.title} />
    <article className="mx-auto max-w-[70ch]">
      <GlowBackdrop still />
      <header className="mb-8 flex flex-col gap-2">
        <h1 className="text-[30px] leading-tight font-semibold tracking-tight">{lesson.title}</h1>
      </header>
      <Markdown source={body} />
      <footer className="mt-12 flex flex-col gap-6 border-t border-hairline pt-6">
        <MarkDone lessonId={lesson.id} done={lesson.done} />
        <nav aria-label="Notes" className="flex flex-wrap justify-between gap-3">
          {prev ? (
            <Button variant="secondary" asChild>
              <Link href={`${base}/${prev.slug}`}>
                <ArrowLeft />
                {prev.title}
              </Link>
            </Button>
          ) : (
            <span />
          )}
          <Button variant="secondary" asChild>
            <Link href={next ? `${base}/${next.slug}` : base}>
              {next ? next.title : `Back to ${node.name}`}
              <ArrowRight />
            </Link>
          </Button>
        </nav>
      </footer>
    </article>
    </>
  )
}

// ---------------------------------------------------------------------------
// A book: its chapters, read ticks and quiz scores
// ---------------------------------------------------------------------------
export function BookView({
  ctx,
  subject,
  book,
  quizzes,
}: {
  ctx: Ctx
  subject: TreeNode
  book: BookNode
  quizzes: Map<string, { testId: string; best: number | null; questionCount: number }>
}) {
  const base = `${nodeHref(ctx, subject.path)}/books/${book.slug}`
  return (
    <>
      <Breadcrumbs items={trail(ctx, subject.path, true)} current={book.title} />
      <PageHeader
        eyebrow="Book"
        title={book.title}
        description={
          <>
            {[book.author, book.edition && `${book.edition} edition`].filter(Boolean).join(' · ')}
            {book.description && <span className="block">{book.description}</span>}
          </>
        }
      />
      <Panel>
        <h2 className="mb-1 text-lg font-semibold">Chapters</h2>
        {book.chapters.length === 0 ? (
          <EmptyState icon={<BookOpen />} title="No chapters yet">
            Chapter gists appear here as soon as they are added.
          </EmptyState>
        ) : (
          <ol className="divide-y divide-hairline">
            {book.chapters.map((c) => {
              const quiz = quizzes.get(c.id)
              return (
                <li key={c.id} className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <Link href={`${base}/${c.slug}`} className="focus-ring flex min-w-0 items-center gap-4 rounded-lg hover:underline">
                    <Mono className="w-6 text-sm text-muted-foreground">{String(c.number).padStart(2, '0')}</Mono>
                    <span className="font-medium">{c.title}</span>
                    {c.read && (
                      <Badge tone="correct">
                        <Check className="size-3" aria-hidden />
                        Read
                      </Badge>
                    )}
                  </Link>
                  <div className="flex shrink-0 flex-wrap items-center gap-2 pl-10 sm:pl-0">
                    {quiz?.best !== null && quiz?.best !== undefined && (
                      <span className="text-[13px] text-muted-foreground">
                        best <Mono className="text-foreground">{formatScore(quiz.best)}</Mono>/<Mono>{quiz.questionCount}</Mono>
                      </span>
                    )}
                    <Button variant="secondary" size="sm" asChild>
                      <Link href={`${base}/${c.slug}`}>
                        Read<span className="sr-only"> chapter {c.number}</span>
                      </Link>
                    </Button>
                    {quiz && quiz.questionCount > 0 && (
                      <ActionButton size="sm" variant="ghost" action={startTest.bind(null, quiz.testId, 'practice')}>
                        Quiz<span className="sr-only"> for chapter {c.number}</span>
                      </ActionButton>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </Panel>
    </>
  )
}

// ---------------------------------------------------------------------------
// A chapter: gist and key facts, what it covers, then the quiz
// ---------------------------------------------------------------------------
export function ChapterView({
  ctx,
  subject,
  book,
  chapter,
  gist,
  quiz,
  prev,
  next,
}: {
  ctx: Ctx
  subject: TreeNode
  book: BookNode
  chapter: RawChapter
  gist: string
  quiz: { testId: string; questionCount: number; bestScore: number | null } | null
  prev: RawChapter | null
  next: RawChapter | null
}) {
  const bookHref = `${nodeHref(ctx, subject.path)}/books/${book.slug}`
  const covers = chapter.coverIds.map((id) => ctx.tree.byId.get(id)).filter((n): n is TreeNode => Boolean(n))
  return (
    <>
    <Breadcrumbs items={[...trail(ctx, subject.path, true), { href: bookHref, label: book.title }]} current={`${chapter.number}. ${chapter.title}`} />
    <article className="mx-auto max-w-[70ch]">
      <GlowBackdrop still />
      <header className="mb-6 flex flex-col gap-2">
        <Eyebrow>{book.title}</Eyebrow>
        <h1 className="text-[30px] leading-tight font-semibold tracking-tight">
          <Mono className="mr-2 text-muted-foreground">{chapter.number}.</Mono>
          {chapter.title}
        </h1>
        {covers.length > 0 && (
          <p className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
            <Tag className="size-3.5" aria-hidden />
            Covers
            {covers.map((n) => (
              <Link key={n.id} href={nodeHref(ctx, n.path)} className="focus-ring rounded-full border border-hairline bg-panel px-2.5 py-0.5 hover:bg-soft">
                {[...ctx.tree.ancestors(n.path).slice(1), n].map((x) => x.name).join(' › ') || n.name}
              </Link>
            ))}
          </p>
        )}
      </header>

      <Markdown source={gist} className="[&_h2]:mt-8 [&_li]:my-2 [&_strong]:font-semibold [&_strong]:text-tint-foreground" />

      <footer className="mt-10 flex flex-col gap-6 border-t border-hairline pt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <MarkChapterRead chapterId={chapter.id} read={chapter.read} />
          {quiz && quiz.questionCount > 0 && (
            <div className="flex flex-col items-end gap-1">
              <ActionButton action={startTest.bind(null, quiz.testId, 'practice')}>
                <FileQuestion />
                Take the chapter quiz
              </ActionButton>
              <p className="text-[13px] text-muted-foreground">
                <Mono>{quiz.questionCount}</Mono> questions
                {quiz.bestScore !== null && (
                  <>
                    {' '}
                    · best <Mono>{formatScore(quiz.bestScore)}</Mono>
                  </>
                )}
              </p>
            </div>
          )}
        </div>
        <nav aria-label="Chapters" className="flex flex-wrap justify-between gap-3">
          {prev ? (
            <Button variant="secondary" asChild>
              <Link href={`${bookHref}/${prev.slug}`}>
                <ArrowLeft />
                {prev.number}. {prev.title}
              </Link>
            </Button>
          ) : (
            <span />
          )}
          <Button variant="secondary" asChild>
            <Link href={next ? `${bookHref}/${next.slug}` : bookHref}>
              {next ? `${next.number}. ${next.title}` : `Back to ${book.title}`}
              <ArrowRight />
            </Link>
          </Button>
        </nav>
      </footer>
    </article>
    </>
  )
}
