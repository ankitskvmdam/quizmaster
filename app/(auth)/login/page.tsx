import type { Metadata } from 'next'
import { AuthCard, AuthHeading, AuthLink } from '@/components/auth-form'
import { safeNext } from '@/lib/safe-next'
import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'Sign in' }

const notices: Record<string, string> = {
  link: 'That link has expired or was already used. Sign in, or ask for a new link.',
}

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const sp = await searchParams
  const next = safeNext(typeof sp.next === 'string' ? sp.next : undefined)
  const notice = typeof sp.error === 'string' ? notices[sp.error] : undefined
  const info =
    sp.notice === 'confirmed'
      ? 'Your email is confirmed (or that link was already used). Sign in with your email and password.'
      : undefined

  return (
    <AuthCard>
      <AuthHeading title="Sign in">Welcome back. Pick up where you left off.</AuthHeading>
      <LoginForm next={next} notice={notice} info={info} />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Invited and new here? <AuthLink href="/signup">Create your account</AuthLink>
      </p>
    </AuthCard>
  )
}
