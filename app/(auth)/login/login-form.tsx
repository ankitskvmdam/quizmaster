'use client'

import { useActionState } from 'react'
import { signIn, type AuthState } from '../actions'
import { AuthForm, AuthLink, FormError } from '@/components/auth-form'
import { FormField, describedBy } from '@/components/form-field'
import { SubmitButton } from '@/components/submit-button'
import { Input } from '@/components/ui/input'

export function LoginForm({ next, notice }: { next: string; notice?: string }) {
  const [state, action] = useActionState<AuthState, FormData>(signIn, null)
  const err = state && !state.ok ? state : null
  const emailError = err?.field === 'email' ? err.message : null
  const passwordError = err?.field === 'password' ? err.message : null

  return (
    <AuthForm action={action}>
      <input type="hidden" name="next" value={next} />
      <FormError message={err?.field === null ? err.message : notice} />
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
        action={<AuthLink href="/forgot-password">Forgot password?</AuthLink>}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(passwordError) || undefined}
          aria-describedby={describedBy('password', passwordError)}
        />
      </FormField>
      <SubmitButton size="lg" className="w-full">
        Sign in
      </SubmitButton>
    </AuthForm>
  )
}
