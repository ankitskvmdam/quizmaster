export const NOT_INVITED_MESSAGE =
  "This email hasn't been invited yet. Ask the person who shared this link to add you."

export type FieldError = { field: 'email' | 'password' | null; message: string }

/** Maps a Supabase sign-up error onto the field it belongs to. */
export function mapSignUpError(e: { status?: number; message: string }): FieldError {
  const msg = e.message.toLowerCase()
  if (e.status === 403 || msg.includes('invited')) return { field: 'email', message: NOT_INVITED_MESSAGE }
  if (msg.includes('password')) return { field: 'password', message: e.message }
  return { field: null, message: 'Something went wrong. Try again.' }
}
