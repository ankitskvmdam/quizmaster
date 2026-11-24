import { redirect } from 'next/navigation'

/** The syllabus lives under Courses; this keeps the old address working. */
export default async function OldSyllabusPage({ params }: PageProps<'/tests/[exam]/syllabus'>) {
  redirect(`/courses/syllabus/${(await params).exam}`)
}
