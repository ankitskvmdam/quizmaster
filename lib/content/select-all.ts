type Page<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>

/**
 * Reads every row of a query, a page at a time. The Supabase API returns at most `max_rows` (1000) rows per
 * request, so a plain select silently truncates large tables. `page(from, to)` must apply `.range(from, to)`
 * to a query with a stable order.
 */
export async function selectAll<T>(page: (from: number, to: number) => Page<T>, what: string, size = 1000): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += size) {
    const { data, error } = await page(from, from + size - 1)
    if (error) throw new Error(`${what}: ${error.message}`)
    out.push(...(data ?? []))
    if (!data || data.length < size) return out
  }
}
