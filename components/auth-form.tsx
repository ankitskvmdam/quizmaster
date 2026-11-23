import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function AuthCard({ className, ...props }: ComponentProps<'section'>) {
  return (
    <section
      className={cn(
        'w-full max-w-[26rem] rounded-card border border-hairline bg-panel p-6 shadow-panel sm:p-8',
        className,
      )}
      {...props}
    />
  )
}

export function AuthHeading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-1.5">
      <h1 className="text-[22px] font-semibold tracking-tight">{title}</h1>
      {children && <p className="text-[15px] text-muted-foreground">{children}</p>}
    </header>
  )
}

export function AuthForm({ className, ...props }: ComponentProps<'form'>) {
  return <form noValidate className={cn('flex flex-col gap-5', className)} {...props} />
}

/** An error that does not belong to one field, shown above the fields. */
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-lg border border-wrong-border bg-wrong px-3.5 py-2.5 text-sm text-wrong-fg">
      {message}
    </p>
  )
}

export function AuthLink({ className, ...props }: ComponentProps<typeof Link>) {
  return <Link className={cn('focus-ring rounded text-sm font-medium text-primary hover:underline', className)} {...props} />
}
