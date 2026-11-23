export function greeting(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export type LessonRef = { id: string; topicId: string; done: boolean }

/**
 * The lesson to continue with. `lessons` are in reading order (subject → topic → position).
 * Prefer the next unfinished lesson in the topic of the most recently finished one; otherwise the first
 * unfinished lesson anywhere; null when everything is done.
 */
export function nextLesson<T extends LessonRef>(lessons: T[], lastDoneId: string | null): T | null {
  const last = lastDoneId ? lessons.find((l) => l.id === lastDoneId) : undefined
  if (last) {
    const inTopic = lessons.find((l) => l.topicId === last.topicId && !l.done)
    if (inTopic) return inTopic
  }
  return lessons.find((l) => !l.done) ?? null
}

const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000

/** A feed item is "New" for 14 days after publishing, until the person opens it. */
export function isNewItem(publishedAt: string | null, seen: boolean, now: number): boolean {
  if (!publishedAt || seen) return false
  return now - Date.parse(publishedAt) <= FOURTEEN_DAYS
}
