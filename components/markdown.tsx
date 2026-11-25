import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import type { Element, ElementContent } from 'hast'
import type { ContentLang } from '@/lib/lang'
import { cn } from '@/lib/utils'

/** `reading` is study text (chapter gists, short notes); the others are test questions and explanations. */
type Variant = 'lesson' | 'question' | 'option' | 'reading'

/** Text of a hast node, for reading a callout's label. */
function textOf(node: ElementContent | undefined): string {
  if (!node) return ''
  if (node.type === 'text') return node.value
  if (node.type === 'element') return node.children.map(textOf).join('')
  return ''
}

/** A blockquote whose first paragraph starts with bold text is a callout titled by that text ("**याद रखें**"). */
function calloutTitle(node: Element | undefined): string | null {
  const firstP = node?.children.find((c): c is Element => c.type === 'element' && c.tagName === 'p')
  const first = firstP?.children.find((c) => !(c.type === 'text' && c.value.trim() === ''))
  if (!first || first.type !== 'element' || first.tagName !== 'strong') return null
  return textOf(first).trim() || null
}

/** The callout's name for data-callout: "Key facts" → "key-facts", "याद रखें" → "याद-रखें" (matras kept). */
function calloutName(node: Element | undefined): string | null {
  const title = calloutTitle(node)
  if (!title) return null
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9ऀ-ॿ]+/g, '-')
      .replace(/^-+|-+$/g, '') || null
  )
}

const shared: Components = {
  blockquote({ node, children }) {
    const name = calloutName(node)
    if (!name) {
      return <blockquote className="border-l-2 border-hairline pl-4 text-muted-foreground">{children}</blockquote>
    }
    return (
      <div
        data-callout={name}
        className={cn(
          'my-5 rounded-[14px] border-l-[3px] bg-soft px-4 py-3 [&>p:first-child>strong:first-child]:figures [&>p:first-child>strong:first-child]:block [&>p:first-child>strong:first-child]:text-[11px] [&>p:first-child>strong:first-child]:tracking-[0.08em] [&>p:first-child>strong:first-child]:text-muted-foreground [&>p:first-child>strong:first-child]:uppercase [&>p]:my-1',
          name === 'trap' ? 'border-review-fg' : 'border-primary',
        )}
      >
        {children}
      </div>
    )
  },
  // Display maths scrolls sideways on its own when wider than the column, never the page.
  span({ node, className, children, ...props }) {
    if (className === 'katex-display') {
      return (
        <span data-math-display className="my-4 block overflow-x-auto overflow-y-hidden py-1">
          <span className={className} {...props}>
            {children}
          </span>
        </span>
      )
    }
    return (
      <span className={className} {...props}>
        {children}
      </span>
    )
  },
  table({ children }) {
    return (
      <div className="my-5 overflow-x-auto rounded-[14px] border border-hairline">
        <table className="w-full border-collapse text-sm [&_td]:border-t [&_td]:border-hairline [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:figures [&_th]:text-[11px] [&_th]:font-medium [&_th]:tracking-[0.08em] [&_th]:text-muted-foreground [&_th]:uppercase">
          {children}
        </table>
      </div>
    )
  },
  a({ href, children }) {
    return (
      <a href={href} className="focus-ring rounded text-primary underline underline-offset-2" target="_blank" rel="noreferrer">
        {children}
      </a>
    )
  },
  img({ src, alt }) {
    // Content images come from the repo; plain <img> keeps markdown simple.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={typeof src === 'string' ? src : undefined} alt={alt ?? ''} className="my-5 w-full rounded-lg" />
  },
}

const optionComponents: Components = {
  ...shared,
  p: ({ children }) => <>{children}</>,
}

/**
 * Study text. Headings, lists, tables and callouts are styled here rather than on the container, so a heading or
 * cell never inherits mono figures, uppercase or tracking (which break Devanagari conjuncts). Nothing here clips:
 * no fixed heights and no overflow on text boxes, so matras above and below the line always show.
 */
function readingComponents(lang: ContentLang): Components {
  const hi = lang === 'hi'
  return {
    ...shared,
    h2: ({ children }) => <h2 className="mt-10 mb-3 text-[21px] leading-[1.4] font-semibold md:text-[23px]">{children}</h2>,
    h3: ({ children }) => <h3 className="mt-8 mb-2 text-[19px] leading-[1.4] font-semibold md:text-[20px]">{children}</h3>,
    h4: ({ children }) => <h4 className="mt-6 mb-2 text-[17px] leading-[1.4] font-semibold md:text-[18px]">{children}</h4>,
    ul: ({ node, className, ...props }) => (
      <ul {...props} className={cn('my-4 list-disc ps-6 marker:text-primary [&>li]:my-2 [&>li]:ps-1', className)} />
    ),
    ol: ({ node, className, ...props }) => (
      <ol {...props} className={cn('my-4 list-decimal ps-7 marker:font-semibold [&>li]:my-2 [&>li]:ps-1', className)} />
    ),
    // Devanagari has no italic; a slanted fallback looks broken, so emphasis is weight only for Hindi.
    em: ({ children }) => <em className={cn(hi && 'font-medium not-italic')}>{children}</em>,
    // The table scrolls inside its own box; the page never does. Focusable so keyboard users can scroll it too.
    table: ({ children }) => (
      <div
        role="region"
        aria-label={hi ? 'तालिका' : 'Table'}
        tabIndex={0}
        data-table-scroll
        className="focus-ring my-6 max-w-full overflow-x-auto overscroll-x-contain rounded-[14px] border border-hairline bg-panel"
      >
        <table className="w-full border-collapse text-[15px] leading-[1.6] [&_td]:border-t [&_td]:border-hairline [&_td]:px-4 [&_td]:py-3 [&_td]:align-top [&_th]:min-w-[7.5rem] [&_th]:border-b [&_th]:border-hairline [&_th]:bg-soft [&_th]:px-4 [&_th]:py-3 [&_th]:text-start [&_th]:align-bottom [&_th]:font-semibold">
          {children}
        </table>
      </div>
    ),
    // Long cells get a wider column so a wide table scrolls instead of stacking a few words per line.
    td: ({ node, className, ...props }) => (
      <td {...props} className={cn(textOf(node).length > 40 ? 'min-w-[14rem]' : 'min-w-[7.5rem]', className)} />
    ),
    blockquote({ node, children }) {
      const title = calloutTitle(node)
      if (!title) {
        return <blockquote className="my-5 border-s-[3px] border-hairline ps-4">{children}</blockquote>
      }
      const name = calloutName(node)
      return (
        <aside
          data-callout={name}
          aria-label={title}
          className={cn(
            // A solid panel (not the translucent tint) keeps every text colour inside at 7:1 or more in both themes.
            'my-6 rounded-[14px] border border-s-4 bg-panel px-4 py-4 md:px-5',
            '[&>p]:my-2 [&>p:first-child]:mt-0 [&>p:first-child>strong:first-child]:block [&>p:first-child>strong:first-child]:font-semibold [&>*:last-child]:mb-0 [&>ul]:my-2 [&>ol]:my-2',
            name === 'trap'
              ? 'border-review-fg/45 border-s-review-fg [&>p:first-child>strong:first-child]:text-foreground'
              : 'border-primary/35 border-s-primary [&>p:first-child>strong:first-child]:text-tint-foreground',
          )}
        >
          {children}
        </aside>
      )
    },
  }
}

const readingHi = readingComponents('hi')
const readingEn = readingComponents('en')

const variantClass: Record<Variant, string> = {
  lesson:
    'text-base leading-[1.7] [&_h2]:mt-9 [&_h2]:mb-3 [&_h2]:text-[21px] [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-[17px] [&_h3]:font-semibold [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1',
  // Statement questions ("1. … 2. … Which of the above…") depend on visible numbers, so lists keep their markers.
  question:
    'text-[18px] leading-[1.6] [&_p]:my-2 [&_p:first-child]:mt-0 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-7 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-7 [&_li]:my-1 [&_li]:pl-1',
  option: 'text-[15px] leading-[1.5]',
  // 17px on phones, 18px from 768px; at most ~68ch wide; no tracking, no justification.
  reading:
    'max-w-[68ch] text-[17px] leading-[1.75] font-normal tracking-normal text-start text-foreground md:text-[18px] [&_p]:my-4 [&>:first-child]:mt-0',
}

/** Renders lessons, question stems, options and explanations: GFM + KaTeX maths + callouts. */
export function Markdown({
  source,
  variant = 'lesson',
  lang,
  className,
}: {
  source: string
  variant?: Variant
  /** The language of `source`. Hindi study text gets lang="hi" and the Devanagari face. */
  lang?: ContentLang
  className?: string
}) {
  const Tag = variant === 'option' ? 'span' : 'div'
  const components =
    variant === 'option' ? optionComponents : variant === 'reading' ? (lang === 'hi' ? readingHi : readingEn) : shared
  return (
    <Tag lang={lang} className={cn(variantClass[variant], variant === 'reading' && lang === 'hi' && 'font-hindi', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={components}>
        {source}
      </ReactMarkdown>
    </Tag>
  )
}
