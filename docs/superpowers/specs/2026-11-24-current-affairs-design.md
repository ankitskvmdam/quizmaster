# Monthly Current Affairs — Design

Date: 2026-11-24 · Status: draft for review · Builds on `2026-11-23-gs-app-design.md` and `DESIGN_DIRECTION.md`.

## Intent

QuizMaster today teaches General Studies maths and reasoning by topic. The owner wants to add **monthly current
affairs** for learners preparing for **RRB, SSC and similar exams** (and general readers). Current affairs in these
exams is fact recall — appointments, awards, schemes, important days, sports, summits, rankings — asked as one-line
MCQs. Material is easy to read once and forget, so the goal is that it is **easy to grasp**: **short notes grouped by
category, then quick MCQ practice**.

Content is added **one month at a time** (January 2026, February 2026, …). Learners also revise over longer periods:
**3 months, 6 months and a year**.

## Goals

- General Studies has two sections: **Current Affairs** (by month) and **Maths & Reasoning** (the existing topics).
- A month page lists its categories; each category opens short notes and offers quick practice.
- A note is one fact: date, category, the key fact with the answer-worthy part in bold, and an optional one-line
  "exam angle" (e.g. who it succeeds, where it happened).
- Quick practice: untimed, ~10 questions per category, answer and explanation after each (the existing practice mode).
- Revision periods built from months, never authored separately: calendar blocks (quarters Jan–Mar…, halves
  Jan–Jun / Jul–Dec, calendar year) **and** "last N months up to a chosen month" (N = 3, 6, 12).
- Period pages show category notes across the period and offer timed revision tests and practice over the period.
- Everything existing keeps working: timed/practice runner, review, scoring, history, custom tests, Study, New feed.

## Non-goals

- Writing or sourcing the content itself (this design is the structure; content arrives through files).
- Admin UI, comments, news feeds, push notifications, per-exam filtering (RRB vs SSC) in v1.
- Changing the maths topics' format.

## Anti-goals

- Authoring the same fact twice (once per month and again in a compilation).
- Notes that become long articles; a note that needs more than ~2 lines is too long.
- Breaking answer hiding: current-affairs questions follow the same column grants and attempt functions.

## Approaches (decided: B)

- **A. Reuse topics/lessons** (month = topic, category = Markdown lesson, questions tagged by category) — least code,
  but notes become free text and category roll-ups across months rely on fragile tags. Rejected.
- **B. Dedicated structure — chosen.** A `sections` layer under subjects; `ca_months`; one row per note in `ca_notes`;
  questions stay in `questions`, linked to a month and a category, so tests, reviews and scoring are reused unchanged.
- **C. Generic time-based collections** for any subject — more flexible, nothing needs it yet. Rejected (YAGNI).

Periods: **both** calendar blocks and rolling "last N months" (owner's choice).

## Structure

### Data (new migration)

- `sections(id, subject_id, slug, name, kind enum('topics','current_affairs'), position)`, unique (subject_id, slug).
  General Studies gets `maths-reasoning` (kind topics) and `current-affairs` (kind current_affairs).
- `topics.section_id` (nullable at first, backfilled to `maths-reasoning` for existing GS topics).
- `ca_categories(slug pk, name, position)` — a fixed, ordered list loaded from content (see Content).
- `ca_months(id, section_id, month date — always the 1st, published, published_at, created_at)`, unique (section_id, month).
- `ca_notes(id, month_id, category_slug → ca_categories, slug, happened_on date null, body_md, angle_md null,
  position, updated_at)`, unique (month_id, slug).
- `questions` gains `ca_month_id` (nullable) and `ca_category_slug` (nullable); `topic_id` becomes nullable with a
  check that exactly one of `topic_id` / `ca_month_id` is set. Existing grants stay: `correct_key` and
  `explanation_md` remain hidden; the new columns are added to the `authenticated` column grant.
- `ca_progress(user_id, month_id, category_slug, read_at)` — "I've read this category for this month" (own rows only,
  same RLS pattern as `lesson_progress`).
- RLS: signed-in users read published months, their notes and categories; writes are service role only.

### Functions

- `create_period_test(p_from date, p_to date, p_categories text[] default null, p_count int, p_duration_sec int default null)`
  → test id. Same rules as `create_custom_test` (5–50 questions, random order, `kind='custom'`, owned by the caller),
  drawing from current-affairs questions in months `p_from..p_to` (inclusive, first-of-month dates) and optional
  categories. Title like "Current affairs: Jan–Mar 2026" / "…: Appointments, Awards · Jan 2026".
- Practice of one category in one month uses the same function with `p_from = p_to`.
- `get_attempt` / `get_attempt_review` show the category name where they show `topic_name` today for CA questions.

### Periods (pure, tested in TS)

- `calendarPeriods(publishedMonths)` → quarters, halves and years that contain at least one published month, each
  `{ label, from, to }` ("Jan–Mar 2026", "Jan–Jun 2026", "2026").
- `rollingPeriod(endMonth, n)` → `{ label: "Last 6 months to Mar 2026", from, to }`.
- A period page accepts `from`/`to` (`YYYY-MM`), validated and clamped to at most 12 months.

### Content (files + push, as today)

```
content/gs/subject.yaml                         # unchanged
content/gs/sections.yaml                        # maths-reasoning, current-affairs (name, kind, position)
content/gs/<topic>/…                            # maths topics as today; topic.yaml gains `section: maths-reasoning`
content/current-affairs/categories.yaml         # ordered list: slug + name
content/current-affairs/2026-01/notes.yaml      # list of notes
content/current-affairs/2026-01/questions.yaml  # list of MCQs, each with `category`
content/current-affairs/2026-01/test.yaml       # the fixed month paper: title, duration_min, questions (slugs from this month)
```

A note:

```yaml
- slug: cea-appointed          # unique within the month
  category: appointments
  date: 2026-01-14              # optional
  note: "**Asha Verma** appointed Chief Economic Adviser."
  angle: "Succeeds R. Kumar · 3-year term"   # optional, one line
```

A question is today's question shape plus `category` (no `topic`); slugs stay unique across all content
(recommended form `ca-2026-01-001`). The push validates: month folder is `YYYY-MM`; categories exist; note and
question slugs unique; a month with questions in a category it has no notes for is a warning, not an error.

Default categories (owner can edit `categories.yaml`): National, International, States, Economy & Banking,
Schemes & Policies, Appointments, Awards & Honours, Sports, Science & Technology, Defence, Environment,
Summits & Conferences, Reports & Rankings, Important Days, Books & Authors, Obituaries.

### Screens (follow DESIGN_DIRECTION)

- **Subjects → General Studies:** two sections. *Current Affairs* shows the latest months as cards
  ("January 2026 · 96 notes · 120 questions · 4/16 categories read") and a "Revise a period" panel;
  *Maths & Reasoning* shows today's topic cards.
- **Month page** (`/subjects/gs/current-affairs/2026-01`): categories in list order, each with note count, a read tick,
  "Read" and "Practice" (10 questions, untimed). A "Practise the whole month" button (25 questions, untimed) and a
  "January 2026 test": the month's **fixed paper** (same 25 questions for everyone, 25 min, +1/−0.33), also listed on the Tests tab.
- **Category notes** (`…/2026-01/appointments`): note cards in date order; bold key fact; muted "↳" exam-angle line;
  date in mono. "Mark as read" at the end and "Practice this category" (primary). Previous / next category.
- **Period page** (`/subjects/gs/current-affairs/period?from=2026-01&to=2026-03`): presets (calendar blocks and
  last 3/6/12 months) as pills; categories across the period with counts; reading a category shows notes grouped by
  month; practice and a timed revision test (choose 25/50 questions) over the period, optionally by category.
- **Runner / review:** unchanged; the eyebrow shows the category (and month) instead of a topic.
- **Study:** "Your progress" adds a Current Affairs row per recent month (categories read / total).
  "Continue" can point to the next unread category of the latest month.
- **New feed:** a newly published month appears as one item ("January 2026 current affairs · 96 notes").

## Decided by the owner

- Content is monthly current affairs for RRB, SSC and general readers.
- Format: short notes by category, then quick MCQ practice.
- Both Current Affairs and Maths & Reasoning live under General Studies.
- Approach B; periods offer both calendar blocks and rolling "last N months".
- Current-affairs timed tests (month and period) use **+1 / −0.33** marking.
- **Months go live on push.** A month folder that is pushed is published; with `--prune`, a month folder removed from
  the files is unpublished (its notes and questions stop showing; attempts keep their reviews).
- **Each month has one fixed test paper** (`test.yaml`): stored as a `kind='mock'` test linked to the month
  (`tests.ca_month_id`), shown on the month page and in the Tests list; its questions must come from that month.
  Random practice (per category, whole month, periods) still uses `create_period_test`.
- **Claude writes the monthly content** (notes and questions) from sources the owner provides, then pushes it with
  the content CLI. Every question's answer must be traceable to a note in the same month.

## My calls (owner can override)

- One note = one fact, bold key fact plus optional one-line exam angle.
- Category list above, editable in `categories.yaml`; categories are global, not per month.
- Read ticks per month × category (not per note).
- Quick practice = 10 untimed; whole month = 25; timed month test 25 × 1 min.
- Period length capped at 12 months.
- Marking is a constant +1 / −0.33 inside `create_period_test` for every current-affairs test (no marking control).
- Maths & Reasoning keeps its URLs (`/subjects/gs/<topic>/…`); `current-affairs` is a reserved segment under the
  subject. The section layer is shown on the subject page only.
- Corrections: an edited note or question updates in place on push. With `--prune`, a note removed from the files is
  deleted (nothing references notes); a removed question gets `retired = true` (new column): never drawn into new
  tests, still shown in past reviews.

## Left to the builder

Exact component split, query shapes, migration ordering and backfill details, empty and loading states (per
DESIGN_DIRECTION), and test cases beyond the ones implied above (period maths, push validation, RLS on the new
tables, `create_period_test` rules).
