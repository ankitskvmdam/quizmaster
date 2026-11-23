'use client'

import { useActionState, useState, useTransition } from 'react'
import { MailCheck } from 'lucide-react'
import { resendConfirmation, signUp, type AuthState } from '../actions'
import { AuthForm, AuthHeading, AuthLink, FormError } from '@/components/auth-form'
import { FormField, describedBy } from '@/components/form-field'
import { PasswordRules } from '@/components/password-rules'
import { SubmitButton } from '@/components/submit-button'
import { IconTile, Mono } from '@/components/surfaces'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function SignupForm() {
  const [state, action] = useActionState<AuthState, FormData>(signUp, null)
  const [password, setPassword] = useState('')

  if (state?.ok && state.sentTo) return <CheckEmail email={state.sentTo} />

  const err = state && !state.ok ? state : null
  const emailError = err?.field === 'email' ? err.message : null
  const passwordError = err?.field === 'password' ? err.message : null

  return (
    <>
      <AuthHeading title="Create your account">
        QuizMaster is invite only. Use the email address you were invited with.
      </AuthHeading>
      <AuthForm action={action}>
        <FormError message={err?.field === null ? err.message : null} />
        <FormField id="email" label="Email" error={emailError}>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            aria-invalid={Boolean(emailError) || undefined}
            aria-describedby={describedBy('email', emailError)}
          />
        </FormField>
        <FormField
          id="password"
          label="Password"
          error={passwordError}
          hint={<PasswordRules id="password-rules" password={password} />}
        >
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(passwordError) || undefined}
            aria-describedby={describedBy('password', passwordError, true)}
          />
        </FormField>
        <SubmitButton size="lg" className="w-full">
          Create account
        </SubmitButton>
      </AuthForm>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account? <AuthLink href="/login">Sign in</AuthLink>
      </p>
    </>
  )
}

function CheckEmail({ email }: { email: string }) {
  const [pending, start] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-5">
      <IconTile size="lg">
        <MailCheck />
      </IconTile>
      <AuthHeading title="Check your email">
        We sent a confirmation link to <Mono className="text-foreground">{email}</Mono>. Open it to finish
        creating your account.
      </AuthHeading>
      <p role="status" className="text-sm text-muted-foreground">
        {message}
      </p>
      <div className="flex items-center justify-between gap-3">
        <AuthLink href="/login">Back to sign in</AuthLink>
        <Button
          variant="secondary"
          size="sm"
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={() =>
            start(async () => {
              const r = await resendConfirmation(email)
              setMessage(r?.ok ? 'Sent again. It can take a minute to arrive.' : (r?.message ?? null))
            })
          }
        >
          Resend email
        </Button>
      </div>
    </div>
  )
}
