'use client'

import { useActionState } from 'react'
import { requestReset, type AuthState } from '../actions'
import { AuthCard, AuthForm, AuthHeading, AuthLink, FormError } from '@/components/auth-form'
import { FormField, describedBy } from '@/components/form-field'
import { SubmitButton } from '@/components/submit-button'
import { Mono } from '@/components/surfaces'
import { Input } from '@/components/ui/input'

export default function ForgotPasswordPage() {
  const [state, action] = useActionState<AuthState, FormData>(requestReset, null)
  const err = state && !state.ok ? state : null
  const emailError = err?.field === 'email' ? err.message : null

  return (
    <AuthCard>
      {state?.ok ? (
        <>
          <AuthHeading title="Check your email">
            If <Mono className="text-foreground">{state.sentTo}</Mono> has an account, a link to choose a new
            password is on its way.
          </AuthHeading>
          <AuthLink href="/login">Back to sign in</AuthLink>
        </>
      ) : (
        <>
          <AuthHeading title="Forgot your password?">We&apos;ll email you a link to choose a new one.</AuthHeading>
          <AuthForm action={action}>
            <FormError message={err?.field === null ? err.message : null} />
            <FormField id="email" label="Email" error={emailError}>
              <Input
                id="email"
                name="email"
                defaultValue={err?.values?.email}
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                aria-invalid={Boolean(emailError) || undefined}
                aria-describedby={describedBy('email', emailError)}
              />
            </FormField>
            <SubmitButton size="lg" className="w-full">
              Send reset link
            </SubmitButton>
          </AuthForm>
          <p className="mt-6 text-center text-sm">
            <AuthLink href="/login">Back to sign in</AuthLink>
          </p>
        </>
      )}
    </AuthCard>
  )
}
