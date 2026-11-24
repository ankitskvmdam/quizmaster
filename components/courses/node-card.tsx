import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { TreeNode } from "@/lib/courses/tree";
import { materialCounts } from "@/lib/courses/counts";
import { Panel, Mono } from "@/components/surfaces";
import { ProgressBar } from "@/components/progress-bar";

/** A node of the syllabus tree (a subject, a section, a topic): its size and the person's progress. */
export function NodeCard({ href, node }: { href: string; node: TreeNode }) {
  // Books of every kind, by their on-screen names; short notes are shown with progress below.
  const shelves = materialCounts({
    shortNotes: 0,
    bookKinds: node.books.map((b) => b.kind),
  });
  const parts: React.ReactNode[] = [];
  if (node.children.length > 0)
    parts.push(
      <>
        <Mono>{node.children.length}</Mono>{" "}
        {node.children.length === 1 ? "section" : "sections"}
      </>,
    );
  for (const c of shelves)
    parts.push(
      <>
        <Mono>{c.n}</Mono> {c.label}
      </>,
    );
  if (node.lessonCount > 0)
    parts.push(
      <>
        <Mono>
          {node.doneCount}/{node.lessonCount}
        </Mono>{" "}
        short notes read
      </>,
    );
  if (node.questionCount > 0)
    parts.push(
      <>
        <Mono>{node.questionCount}</Mono> questions
      </>,
    );
  return (
    <Link href={href} className="focus-ring group rounded-panel">
      <Panel className="flex h-full flex-col gap-3 transition-colors group-hover:border-primary/40">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold">{node.name}</h3>
          <ChevronRight
            className="mt-1 size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
        </div>
        {node.description && (
          <p className="text-sm text-muted-foreground">{node.description}</p>
        )}
        <div className="mt-auto flex flex-col gap-2 pt-2">
          {node.lessonCount > 0 && (
            <ProgressBar
              value={node.doneCount}
              max={node.lessonCount}
              label={`${node.name}: short notes read`}
            />
          )}
          <p className="flex flex-wrap gap-x-2 text-[13px] text-muted-foreground">
            {parts.map((part, k) => (
              <span key={k}>
                {k > 0 && "· "}
                {part}
              </span>
            ))}
          </p>
        </div>
      </Panel>
    </Link>
  );
}
