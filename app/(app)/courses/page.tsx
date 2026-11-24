import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, ListTree } from "lucide-react";
import { listCourses } from "@/lib/queries/courses";
import { PageHeader } from "@/components/page-header";
import { Panel, IconTile, Mono } from "@/components/surfaces";

export const metadata: Metadata = { title: "Courses" };

export default async function CoursesPage() {
  const courses = await listCourses();
  return (
    <>
      <PageHeader
        title="Courses"
        description="Pick a course, then a subject. Read the notes and book summaries, then practise."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((c) => (
          <Link
            key={c.slug}
            href={`/courses/${c.slug}`}
            className="focus-ring group rounded-panel"
          >
            <Panel className="flex h-full flex-col gap-3 transition-colors group-hover:border-primary/40">
              <IconTile>
                <GraduationCap />
              </IconTile>
              <h2 className="text-lg font-semibold">{c.name}</h2>
              {c.description && (
                <p className="text-sm text-muted-foreground">{c.description}</p>
              )}
              <p className="mt-auto text-[13px] text-muted-foreground">
                <Mono>{c.subjectCount}</Mono>{" "}
                {c.subjectCount === 1 ? "subject" : "subjects"} ·{" "}
                <Mono>{c.lessonCount}</Mono>{" "}
                {c.lessonCount === 1 ? "note" : "notes"} ·{" "}
                <Mono>{c.bookCount}</Mono>{" "}
                {c.bookCount === 1 ? "book" : "books"}
              </p>
            </Panel>
          </Link>
        ))}
        <Link
          href="/courses/syllabus"
          className="focus-ring group rounded-panel"
        >
          <Panel className="flex h-full flex-col gap-3 transition-colors group-hover:border-primary/40">
            <IconTile>
              <ListTree />
            </IconTile>
            <h2 className="text-lg font-semibold">Syllabus</h2>
            <p className="text-sm text-muted-foreground">
              What BPSC, SSC CGL and SSC CHSL ask, worked out from their
              previous-year papers.
            </p>
            <p className="mt-auto text-[13px] text-muted-foreground">
              Chapters ranked by how often they are asked
            </p>
          </Panel>
        </Link>
      </div>
    </>
  );
}
