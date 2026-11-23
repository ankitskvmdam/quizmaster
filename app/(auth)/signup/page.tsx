import type { Metadata } from 'next'
import { AuthCard } from '@/components/auth-form'
import { SignupForm } from './signup-form'

export const metadata: Metadata = { title: 'Create account' }

export default function SignupPage() {
  return (
    <AuthCard>
      <SignupForm />
    </AuthCard>
  )
}
