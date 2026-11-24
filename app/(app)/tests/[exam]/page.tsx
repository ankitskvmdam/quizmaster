import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { FileClock } from 'lucide-react'
import { getExamPapers } from '@/lib/queries/tests'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/surfaces'
import { EmptyState } from '@/components/empty-state'
import { TestList } from '@/components/tests/test-list'
import { Breadcrumbs } from '@/components/courses/crumbs'

type Props = PageProps<'/tests/[exam]'>

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getExamPapers((await params).exam)
  return { title: data ? `${data.exam.name} papers` : 'Papers' }
}

/** An exam's previous-year papers, grouped by year, newest first. */
export default async function ExamPapersPage({ params }: Props) {
  const data = await getExamPapers((await params).exam)
  if (!data) notFound()
  const { exam, papers } = data
  const years = [...new Set(papers.map((p) => p.year))]

  return (
    <>
      <Breadcrumbs root="tests" items={[]} current={exam.name} />
      <PageHeader title={exam.name} description={exam.description || undefined} />
      {papers.length === 0 ? (
        <Panel>
          <EmptyState icon={<FileClock />} title="No papers yet">
            {exam.name} previous-year papers appear here as soon as they are added.
          </EmptyState>
        </Panel>
      ) : (
        <div className="flex flex-col gap-8">
          {years.map((year) => (
            <section key={year} aria-labelledby={`y${year}`}>
              <h2 id={`y${year}`} className="mb-3 text-lg font-semibold">
                {year}
              </h2>
              <Panel>
                <TestList tests={papers.filter((p) => p.year === year)} empty={null} />
              </Panel>
            </section>
          ))}
        </div>
      )}
    </>
  )
}
