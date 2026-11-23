import { Skeleton } from '@/components/loading'

export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-4">
      <Skeleton className="h-9 w-56 rounded-lg" />
      <Skeleton className="h-5 w-80 max-w-full rounded-lg" />
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Skeleton className="h-40 rounded-panel" />
        <Skeleton className="h-40 rounded-panel" />
      </div>
    </div>
  )
}
