import type { CaNote } from '@/lib/queries/current-affairs'
import { formatDate } from '@/lib/format'
import { Markdown } from '@/components/markdown'
import { Mono } from '@/components/surfaces'

/** One fact: the date, the note with its key part in bold, and an optional one-line exam angle. */
export function NoteCard({ note }: { note: CaNote }) {
  return (
    <article className="flex flex-col gap-1.5 rounded-panel border border-hairline bg-panel px-5 py-4 shadow-panel">
      {note.happenedOn && (
        <Mono className="text-[12px] text-muted-foreground">{formatDate(`${note.happenedOn}T00:00:00`)}</Mono>
      )}
      <Markdown source={note.body_md} className="text-[16px] leading-[1.6] font-normal [&_p]:my-0 [&_strong]:font-semibold [&_strong]:text-tint-foreground" />
      {note.angle_md && (
        <p className="flex gap-1.5 text-[14px] text-muted-foreground">
          <span aria-hidden>↳</span>
          <span className="sr-only">Exam angle: </span>
          <Markdown variant="option" source={note.angle_md} className="text-[14px] leading-[1.5] md:text-[14px]" />
        </p>
      )}
    </article>
  )
}
