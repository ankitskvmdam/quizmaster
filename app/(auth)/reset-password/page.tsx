'use client'

import { useActionState, useState } from 'react'
import { updatePassword, type AuthState } from '../actions'
import { AuthCard, AuthForm, AuthHeading, AuthLink, FormError } from '@/components/auth-form'
import { FormField, describedBy } from '@/components/form-field'
import { PasswordRules } from '@/components/password-rules'
import { SubmitButton } from '@/components/submit-button'
import { Input } from '@/components/ui/input'

export default function ResetPasswordPage() {
  const [state, action] = useActionState<AuthState, FormData>(updatePassword, null)
  const [password, setPassword] = useState('')
  const err = state && !state.ok ? state : null
  const passwordError = err?.field === 'password' ? err.message : null

  return (
    <AuthCard>
      <AuthHeading title="Choose a new password" />
      <AuthForm action={action}>
        <FormError message={err?.field === null || err?.field === 'email' ? err.message : null} />
        <FormField
          id="password"
          label="New password"
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
          Save password
        </SubmitButton>
      </AuthForm>
      <p className="mt-6 text-center text-sm">
        <AuthLink href="/forgot-password">Need a new link?</AuthLink>
      </p>
    </AuthCard>
  )
}
