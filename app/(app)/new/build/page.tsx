import type { Metadata } from 'next'
import { getBuilderCourses } from '@/lib/queries/home'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/surfaces'
import { BuildTest } from '@/components/new/build-test'

export const metadata: Metadata = { title: 'Build a test' }

/** The step-by-step test builder: sections of subject + topics, then the length and mode. */
export default async function BuildTestPage() {
  const courses = await getBuilderCourses()
  return (
    <>
      <PageHeader
        title="Build a test"
        description="Add up to ten sections. In each, choose a subject and the topics you want. Mix subjects freely; the questions are split evenly between sections."
      />
      {courses.length === 0 ? (
        <Panel>
          <p className="text-sm text-muted-foreground">There are no practice questions yet.</p>
        </Panel>
      ) : (
        <BuildTest courses={courses} />
      )}
    </>
  )
}
