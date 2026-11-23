import { cn } from '@/lib/utils'

const circles = [
  'left-[-10vw] top-[-12vh] size-[55vw] bg-[var(--glow-1)] animate-[glow-drift-a_23s_ease-in-out_infinite]',
  'right-[-14vw] top-[8vh] size-[45vw] bg-[var(--glow-2)] animate-[glow-drift-b_19s_ease-in-out_infinite]',
  'bottom-[-18vh] left-[20vw] size-[50vw] bg-[var(--glow-3)] animate-[glow-drift-b_26s_ease-in-out_infinite]',
  'bottom-[-10vh] right-[-6vw] size-[35vw] bg-[var(--glow-4)] animate-[glow-drift-a_21s_ease-in-out_infinite]',
]

/** Decorative glows behind every page. Held still on the runner and the reader. */
export function GlowBackdrop({ still = false }: { still?: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-canvas">
      {circles.map((c, i) => (
        <div
          key={i}
          className={cn('absolute rounded-full opacity-80 blur-[90px] motion-reduce:animate-none', c, still && 'animate-none')}
        />
      ))}
    </div>
  )
}
