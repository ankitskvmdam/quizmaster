import type { Metadata } from 'next'
import { BookOpen, FileText, FolderTree, Library, Search } from 'lucide-react'
import { MIN_QUERY, searchContent } from '@/lib/queries/search'
import type { SearchHit } from '@/lib/search'
import { PageHeader } from '@/components/page-header'
import { Panel, IconTile } from '@/components/surfaces'
import { EmptyState } from '@/components/empty-state'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { textLang } from '@/lib/lang'

export const metadata: Metadata = { title: 'Search' }

const ICON: Record<SearchHit['kind'], typeof BookOpen> = { chapter: BookOpen, lesson: FileText, book: Library, node: FolderTree }

/** Search across chapter gists, notes, books and sections; each result opens the page at the match. */
export default async function SearchPage({ searchParams }: PageProps<'/search'>) {
  const raw = (await searchParams).q
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? ''
  const hits = q.length >= MIN_QUERY ? await searchContent(q) : []

  return (
    <>
      <PageHeader title="Search" description="Chapters, notes, books and sections, in Hindi or English." />
      <form action="/search" role="search" className="mb-6 flex gap-2">
        <label htmlFor="q" className="sr-only">
          Search
        </label>
        <Input id="q" name="q" type="search" defaultValue={q} placeholder="e.g. Champaran, चंपारण, Kunwar Singh" autoFocus autoComplete="off" />
        <button
          type="submit"
          className="focus-ring inline-flex h-11 shrink-0 items-center gap-2 rounded-lg bg-primary px-4 text-[15px] font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Search className="size-4" aria-hidden />
          Search
        </button>
      </form>

      {q.length === 0 ? null : q.length < MIN_QUERY ? (
        <p className="text-sm text-muted-foreground">Type at least {MIN_QUERY} characters.</p>
      ) : hits.length === 0 ? (
        <Panel>
          <EmptyState icon={<Search />} title={`Nothing found for “${q}”`}>
            Try another spelling, or search in the other language.
          </EmptyState>
        </Panel>
      ) : (
        <section aria-labelledby="results">
          <h2 id="results" className="mb-3 text-[13px] text-muted-foreground">
            {hits.length} {hits.length === 1 ? 'result' : 'results'}
            {hits.length === 40 ? ' (showing the first 40)' : ''}
          </h2>
          <Panel>
            <ol className="-my-2 flex flex-col">
              {hits.map((h, i) => {
                const Icon = ICON[h.kind]
                return (
                  <li key={h.key} className={cn(i > 0 && 'border-t border-hairline')}>
                    {/* A plain link: browsers only jump to #:~:text= matches on a full page load, not client-side navigation. */}
                    <a href={h.href} className="focus-ring -mx-2 flex items-start gap-4 rounded-lg px-2 py-3.5 hover:bg-soft">
                      <IconTile size="sm">
                        <Icon />
                      </IconTile>
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="flex flex-wrap items-baseline gap-x-2">
                          <span lang={textLang(h.title)} className="font-medium">
                            {h.title}
                          </span>
                          {/* Always an English word (KIND_LABEL in lib/search.ts), so it keeps its small-caps look. */}
                          <span className="text-[12px] tracking-wide text-muted-foreground uppercase">{h.kindLabel}</span>
                        </span>
                        {(h.snippet.before || h.snippet.match) && (
                          <span
                            lang={textLang(`${h.snippet.before}${h.snippet.match}${h.snippet.after}`)}
                            className="text-sm text-muted-foreground"
                          >
                            {h.snippet.before}
                            {h.snippet.match && <mark className="rounded bg-primary/15 px-0.5 text-foreground">{h.snippet.match}</mark>}
                            {h.snippet.after}
                          </span>
                        )}
                      </span>
                    </a>
                  </li>
                )
              })}
            </ol>
          </Panel>
        </section>
      )}
    </>
  )
}
