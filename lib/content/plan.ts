export type Plan<T> = { create: T[]; update: T[]; unchanged: T[]; missing: T[] }

/** JSON with object keys sorted, so key order never counts as a change. */
export function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_k, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, (v as Record<string, unknown>)[k]]))
      : v,
  )
}

/** Compares what is in the database with what the files say. `missing` are existing rows the files no longer have. */
export function planChanges<T>(
  existing: T[],
  desired: T[],
  key: (t: T) => string,
  comparable: (t: T) => unknown,
): Plan<T> {
  const byKey = new Map(existing.map((e) => [key(e), e]))
  const plan: Plan<T> = { create: [], update: [], unchanged: [], missing: [] }
  const desiredKeys = new Set<string>()
  for (const d of desired) {
    const k = key(d)
    desiredKeys.add(k)
    const e = byKey.get(k)
    if (!e) plan.create.push(d)
    else if (stableStringify(comparable(e)) === stableStringify(comparable(d))) plan.unchanged.push(d)
    else plan.update.push(d)
  }
  plan.missing = existing.filter((e) => !desiredKeys.has(key(e)))
  return plan
}

/**
 * Tests whose question list would change although someone has attempted them. Attempts read the test's current
 * question list, so changing it would rewrite past reviews and in-progress tests.
 */
export function lockedTestChanges(
  existing: { slug: string; questionSlugs: string[] }[],
  updates: { slug: string; questionSlugs: string[] }[],
  attemptedSlugs: Set<string>,
): string[] {
  const before = new Map(existing.map((t) => [t.slug, t.questionSlugs.join('\n')]))
  return updates
    .filter((u) => attemptedSlugs.has(u.slug) && before.has(u.slug) && before.get(u.slug) !== u.questionSlugs.join('\n'))
    .map((u) => u.slug)
}
