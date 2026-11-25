import Link from "next/link";
import {
  ChevronRight,
  ClipboardList,
  History,
  Library,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getContentLang } from "@/lib/queries/user";
import { LangToggle } from "@/components/lang-toggle";
import { textLang } from "@/lib/lang";

export type Crumb = { href: string; label: string };

/** The tab a trail starts from. */
export const CRUMB_ROOTS = {
  courses: { href: "/courses", label: "Courses", icon: Library },
  tests: { href: "/tests", label: "Tests", icon: ClipboardList },
  past: { href: "/past", label: "My Attempts", icon: History },
} satisfies Record<string, Crumb & { icon: LucideIcon }>;

/**
 * The trail from a tab (Courses by default) down to the current page, as a plain line (no background) at the top of the page.
 * On phones the middle of a long trail folds into "…" so the parent and current page stay visible.
 */
export async function Breadcrumbs({
  items,
  current,
  root = "courses",
}: {
  items: Crumb[];
  current: string;
  root?: keyof typeof CRUMB_ROOTS;
}) {
  const {
    href: rootHref,
    label: rootLabel,
    icon: RootIcon,
  } = CRUMB_ROOTS[root];
  const lang = await getContentLang();
  return (
    // Phones: the trail gets the full width and the language switcher sits on its own line below it. From sm up they
    // share one row.
    <div className="mb-4 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <nav aria-label="Breadcrumb" className="max-w-full min-w-0">
        <ol className="-mx-1 flex items-center gap-1 overflow-x-auto py-1 text-[13px] whitespace-nowrap">
          <li className="flex items-center">
            <Link
              href={rootHref}
              className="focus-ring inline-flex items-center gap-1.5 rounded px-1 text-muted-foreground hover:text-foreground"
            >
              <RootIcon className="size-3.5" aria-hidden />
              {rootLabel}
            </Link>
          </li>
          {items.length > 1 && (
            // On phones the middle of a long trail folds into "…", keeping the parent and the current page visible.
            <li className="flex items-center gap-1 sm:hidden" aria-hidden>
              <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="px-1 text-muted-foreground">…</span>
            </li>
          )}
          {items.map((c, i) => (
            <li
              key={c.href}
              className={cn(
                "flex items-center gap-1",
                i < items.length - 1 && "max-sm:hidden",
              )}
            >
              <ChevronRight
                className="size-3.5 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <Link
                href={c.href}
                lang={textLang(c.label)}
                className="focus-ring rounded px-1 text-muted-foreground hover:text-foreground"
              >
                {c.label}
              </Link>
            </li>
          ))}
          <li className="flex items-center gap-1">
            <ChevronRight
              className="size-3.5 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <span
              aria-current="page"
              lang={textLang(current)}
              className="px-1 font-medium text-foreground"
            >
              {current}
            </span>
          </li>
        </ol>
      </nav>
      <LangToggle lang={lang} />
    </div>
  );
}
