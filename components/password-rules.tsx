import { Check, Circle } from 'lucide-react'
import { passwordRules } from '@/lib/validation'
import { cn } from '@/lib/utils'

/** Lists the password rules under the field and ticks each one as it is met. */
export function PasswordRules({ id, password }: { id: string; password: string }) {
  return (
    <ul id={id} className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]" aria-label="Password rules">
      {passwordRules.map((rule) => {
        const met = rule.test(password)
        return (
          <li key={rule.id} className={cn('flex items-center gap-1.5', met ? 'text-correct-fg' : 'text-muted-foreground')}>
            {met ? <Check className="size-3.5" aria-hidden /> : <Circle className="size-3" aria-hidden />}
            {rule.label}
            <span className="sr-only">{met ? '(met)' : '(not met yet)'}</span>
          </li>
        )
      })}
    </ul>
  )
}
