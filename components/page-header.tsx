import type { ReactNode } from 'react'
import { Eyebrow } from '@/components/surfaces'
import { textLang } from '@/lib/lang'

/** Title, one line of description, and the page's actions on the right. */
export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
}: {
  title: string
  description?: ReactNode
  eyebrow?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1.5">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 lang={textLang(title)} className="text-[28px] leading-tight font-semibold tracking-tight">
          {title}
        </h1>
        {description && (
          <p lang={typeof description === 'string' ? textLang(description) : undefined} className="text-[15px] text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  )
}
