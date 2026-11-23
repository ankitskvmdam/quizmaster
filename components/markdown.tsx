import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import type { Element, ElementContent } from 'hast'
import { cn } from '@/lib/utils'

type Variant = 'lesson' | 'question' | 'option'

/** Text of a hast node, for reading a callout's label. */
function textOf(node: ElementContent | undefined): string {
  if (!node) return ''
  if (node.type === 'text') return node.value
  if (node.type === 'element') return node.children.map(textOf).join('')
  return ''
}

/** A blockquote whose first paragraph starts with bold text is a callout named by that text. */
function calloutName(node: Element | undefined): string | null {
  const firstP = node?.children.find((c): c is Element => c.type === 'element' && c.tagName === 'p')
  const first = firstP?.children.find((c) => !(c.type === 'text' && c.value.trim() === ''))
  if (!first || first.type !== 'element' || first.tagName !== 'strong') return null
  return textOf(first).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || null
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

const variantClass: Record<Variant, string> = {
  lesson:
    'text-base leading-[1.7] [&_h2]:mt-9 [&_h2]:mb-3 [&_h2]:text-[21px] [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-[17px] [&_h3]:font-semibold [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1',
  // Statement questions ("1. … 2. … Which of the above…") depend on visible numbers, so lists keep their markers.
  question:
    'text-[18px] leading-[1.6] [&_p]:my-2 [&_p:first-child]:mt-0 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-7 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-7 [&_li]:my-1 [&_li]:pl-1',
  option: 'text-[15px] leading-[1.5]',
}

/** Renders lessons, question stems, options and explanations: GFM + KaTeX maths + callouts. */
export function Markdown({ source, variant = 'lesson', className }: { source: string; variant?: Variant; className?: string }) {
  const Tag = variant === 'option' ? 'span' : 'div'
  return (
    <Tag className={cn(variantClass[variant], className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={variant === 'option' ? optionComponents : shared}
      >
        {source}
      </ReactMarkdown>
    </Tag>
  )
}
