import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { getExam } from '@/lib/queries/tests'
import { buildSyllabusView, loadSyllabus, sourceLine } from '@/lib/syllabus'
import { PageHeader } from '@/components/page-header'
import { Breadcrumbs } from '@/components/courses/crumbs'
import { SyllabusOverview, SyllabusSubjects } from '@/components/syllabus/syllabus-view'

type Props = PageProps<'/courses/syllabus/[exam]'>

/** The exam and its syllabus file, or null when either is missing. Shared by the metadata and the page. */
const load = cache(async (slug: string) => {
  const [exam, syllabus] = await Promise.all([getExam(slug), loadSyllabus(slug)])
  return exam && syllabus ? { exam, syllabus } : null
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await load((await params).exam)
  return { title: data ? `${data.exam.name} syllabus` : 'Syllabus' }
}

/** What an exam asks, built from its previous-year papers: subjects by weight, then topics and chapters by how often they come up. */
export default async function SyllabusPage({ params }: Props) {
  const data = await load((await params).exam)
  if (!data) notFound()
  const { exam, syllabus } = data
  const view = buildSyllabusView(syllabus)

  return (
    <>
      <Breadcrumbs items={[{ href: '/courses/syllabus', label: 'Syllabus' }]} current={exam.name} />
      <PageHeader title={`${exam.name} syllabus`} description={sourceLine(syllabus)} />
      <SyllabusOverview view={view} />
      <SyllabusSubjects view={view} />
    </>
  )
}
