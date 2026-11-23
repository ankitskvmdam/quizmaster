# Monthly Current Affairs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add monthly current affairs under General Studies: short notes by category, quick practice, a fixed paper per month, and revision over calendar blocks or the last N months. The existing maths topics move into a "Maths & Reasoning" section.

**Architecture:**
- New Postgres tables (`sections`, `ca_categories`, `ca_months`, `ca_notes`, `ca_progress`) with the same RLS and grant pattern as today.
- Current-affairs questions stay in `questions`, linked to a month and category, so the runner, review and scoring are reused unchanged. One new `SECURITY DEFINER` function, `create_period_test`, builds practice and revision sets.
- Periods are pure TS. Content is still files plus `content:push`.
- Pages live under a static `current-affairs` segment of `/subjects/[subject]`.

**Tech Stack:** as today. Next.js 16 (App Router, `cacheComponents` off), Supabase (Postgres, RLS, pgTAP), Tailwind/shadcn, Vitest, Playwright-core against local Chrome for checks.

**Spec:** `docs/superpowers/specs/2026-11-24-current-affairs-design.md`. Also `DESIGN_DIRECTION.md` for UI, and `README.md` for the content workflow.

## Global Constraints

- Current-affairs marking is a constant: `marks_correct = 1`, `marks_wrong = -0.33`, for the fixed month paper and for every `create_period_test` test.
- Quick practice is 10 questions untimed. Whole-month practice is 25 untimed. The fixed month paper is 25 questions in 25 minutes. Period revision offers 25 or 50 questions, timed at 1 min each.
- Periods are at most 12 months. Month keys are `YYYY-MM` in URLs and content, and the first-of-month `date` in the DB.
- Answer hiding holds. `correct_key` and `explanation_md` stay out of the `authenticated` column grant. The new `questions` columns (`ca_month_id`, `ca_category_slug`, `retired`) are added to that grant. App code never uses `select('*')` or `count` on `questions`. Count ids instead, because `count(*)` is denied by the column grant.
- Months go live on push (`published = true`). `--prune` unpublishes month folders removed from the files, deletes notes removed from a pushed month, and sets `retired = true` on questions removed from the files. Retired questions are never drawn into new tests but still appear in past reviews.
- Maths & Reasoning keeps its URLs (`/subjects/gs/<topic>/<lesson>`). `current-affairs` is a reserved static segment; a topic may never use that slug, and the loader rejects it.
- Content layout (a ruling that refines the spec's paths): current affairs live inside the subject at `content/gs/current-affairs/`. The folder name is the section slug, declared in `content/gs/sections.yaml`:
  ```
  content/gs/sections.yaml
  content/gs/current-affairs/categories.yaml
  content/gs/current-affairs/2026-01/{notes.yaml,questions.yaml,test.yaml}
  ```
- No invented current affairs in `content/`. Real months are written later from the owner's sources. Every verification here uses fixtures under `tests/fixtures/`, with month `2099-01` and similar so they can't be mistaken for real news.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Write files containing backslashes or backticks with the editor, not shell heredocs.

## Review Focus

1. **A month removed with `--prune` after learners attempted its paper.** The month and its notes disappear from browsing, but the attempt's review still opens with all its questions (the `questions` read policy must not hide them from reviews). Tested in Task 2 and Task 5.
2. **A period crossing a year boundary, e.g. "Last 3 months to Jan 2027".** The label reads "Nov 2026–Jan 2027", and the period draws from all three months. Tested in Task 1 and Task 3.
3. **Category practice when that category has fewer than 5 questions in the month.** Practice starts with what exists if there are at least 1. The button is hidden when there are 0. `create_period_test` must allow fewer than 5 available while still requiring `p_count` between 5 and 50. Tested in Task 3.
4. **A question moved between categories, or a corrected fact, in an already-pushed month.** The push updates it in place. A month paper with attempts still refuses a changed question list (the existing `--force` guard). Tested in Task 5.
5. **Someone types `/subjects/gs/current-affairs/2026-13` or `?from=2026-01&to=2027-06`.** Not-found for a bad month. A period longer than 12 months is clamped to 12 ending at `to`, with no crash. Tested in Task 1 and Task 8.

---

## File Structure

```
lib/periods.ts                                   # month keys, labels, calendar blocks, rolling periods, parse/clamp
supabase/migrations/0007_current_affairs.sql     # sections, ca_* tables, question/test columns, RLS, grants
supabase/migrations/0008_current_affairs_fns.sql # create_period_test, retired exclusion, attempt labels
supabase/tests/0006_current_affairs.test.sql
supabase/tests/0007_period_tests.test.sql
lib/content/schema.ts  lib/content/load.ts  lib/content/push.ts   # extended
lib/queries/current-affairs.ts                   # sections, months, month, category notes, period
app/(app)/actions.ts                             # + startCaPractice, startCaRevision, markCategoryRead
app/(app)/subjects/[subject]/page.tsx            # sections: Current Affairs preview + Maths & Reasoning topics
app/(app)/subjects/[subject]/current-affairs/page.tsx                    # all months + revise a period
app/(app)/subjects/[subject]/current-affairs/[month]/page.tsx            # month: categories, paper, practice
app/(app)/subjects/[subject]/current-affairs/[month]/[category]/page.tsx # notes
app/(app)/subjects/[subject]/current-affairs/period/page.tsx             # period overview
app/(app)/subjects/[subject]/current-affairs/period/[category]/page.tsx  # period notes by month
components/ca/{month-card,category-row,note-card,period-picker,ca-practice-buttons}.tsx
tests/unit/{periods,content-ca}.test.ts
tests/fixtures/content-ca/**                     # gs with sections, 1 topic, current-affairs 2099-01 + 2099-02
```

---

### Task 1: Periods library

**Files:**
- Create: `lib/periods.ts`
- Test: `tests/unit/periods.test.ts`

**Interfaces:**
- Produces:
  - `type MonthKey = string` (`'YYYY-MM'`)
  - `isMonthKey(s: string): boolean`
  - `monthToDate(k: MonthKey): string` → `'2026-01-01'`
  - `dateToMonth(d: string): MonthKey`
  - `addMonths(k, n): MonthKey`
  - `monthsBetween(from, to): MonthKey[]` (inclusive)
  - `formatMonth(k): string` → `'January 2026'`
  - `formatMonthShort(k): string` → `'Jan 2026'`
  - `formatRange(from, to): string`
  - `type Period = { kind: 'month' | 'quarter' | 'half' | 'year' | 'rolling'; label: string; from: MonthKey; to: MonthKey }`
  - `calendarPeriods(published: MonthKey[]): Period[]`
  - `rollingPeriod(end: MonthKey, n: 3 | 6 | 12): Period`
  - `parsePeriod(from?: string, to?: string): Period | null`

- [ ] **Step 1: Write the failing tests**
  - `isMonthKey('2026-01') === true`, while `'2026-13'`, `'2026-1'` and `'26-01'` are false.
  - `addMonths('2026-11', 3) === '2027-02'`.
  - `monthsBetween('2026-11', '2027-01')` deep-equals `['2026-11', '2026-12', '2027-01']`.
  - `formatMonth('2026-01') === 'January 2026'`.
  - `formatRange('2026-01', '2026-03') === 'Jan–Mar 2026'`; `formatRange('2026-11', '2027-01') === 'Nov 2026–Jan 2027'`; `formatRange('2026-01', '2026-01') === 'January 2026'` (en dash U+2013).
  - `calendarPeriods(['2026-01', '2026-02', '2026-05'])` deep-equals, in this order:
    `[{kind: 'year', label: '2026', from: '2026-01', to: '2026-12'}, {kind: 'half', label: 'Jan–Jun 2026', from: '2026-01', to: '2026-06'}, {kind: 'quarter', label: 'Apr–Jun 2026', from: '2026-04', to: '2026-06'}, {kind: 'quarter', label: 'Jan–Mar 2026', from: '2026-01', to: '2026-03'}]`
    Order: years newest first, then halves newest first, then quarters newest first. Only blocks containing a published month are included.
  - `rollingPeriod('2027-01', 3)` deep-equals `{kind: 'rolling', label: 'Last 3 months to Jan 2027', from: '2026-11', to: '2027-01'}`.
  - `parsePeriod('2026-01', '2027-06')` is clamped to `{from: '2026-07', to: '2027-06'}` (12 months), with label `formatRange` of those.
  - `parsePeriod('2026-03', '2026-01')`, `parsePeriod('x', '2026-01')` and `parsePeriod(undefined, undefined)` all return `null`.
- [ ] **Step 2:** Run `npx vitest run tests/unit/periods.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3:** Implement `lib/periods.ts` with pure string and arithmetic code; no `Date` time-zone parsing.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(ca): period and month helpers`.

---

### Task 2: Schema for sections and current affairs

**Files:**
- Create: `supabase/migrations/0007_current_affairs.sql`, `supabase/tests/0006_current_affairs.test.sql`
- Modify: `lib/supabase/database.types.ts` (regenerate)

**Interfaces:**
- Produces (exact):
  - `create type section_kind as enum ('topics', 'current_affairs')`.
  - `sections(id uuid pk, subject_id → subjects on delete cascade, slug, name, kind section_kind, position int default 0, unique (subject_id, slug))`.
  - `topics.section_id uuid null → sections on delete set null`.
  - `ca_categories(slug text pk, name text not null, position int not null default 0)`.
  - `ca_months(id uuid pk, section_id → sections on delete cascade, month date not null check (extract(day from month) = 1), published bool not null default true, published_at timestamptz, created_at, updated_at, unique (section_id, month))`.
  - `ca_notes(id uuid pk, month_id → ca_months on delete cascade, category_slug → ca_categories on update cascade, slug text not null, happened_on date null, body_md text not null, angle_md text null, position int not null default 0, updated_at, unique (month_id, slug))`.
  - `questions`:
    - `topic_id` drops `not null`;
    - adds `ca_month_id uuid null → ca_months on delete restrict`, `ca_category_slug text null → ca_categories on update cascade`, and `retired bool not null default false`;
    - check `(topic_id is null) <> (ca_month_id is null)`;
    - check `ca_month_id is null or ca_category_slug is not null`.
  - `tests.ca_month_id uuid null → ca_months on delete set null`.
  - `ca_progress(user_id default auth.uid() → auth.users on delete cascade, month_id → ca_months on delete cascade, category_slug → ca_categories, read_at timestamptz default now(), primary key (user_id, month_id, category_slug))`.
- Grants:
  - `select` on `sections`, `ca_categories`, `ca_months` and `ca_notes` to `authenticated`.
  - `select`, `insert` and `delete` on `ca_progress`.
  - Add `ca_month_id`, `ca_category_slug` and `retired` to the `questions` column grant.
- RLS:
  - `sections`: readable when its subject is visible (`exists (select 1 from subjects s where s.id = subject_id)`).
  - `ca_categories`: `using (true)`.
  - `ca_months`: `published`.
  - `ca_notes`: `exists` a published month.
  - `ca_progress`: own rows, same three policies as `lesson_progress`.
- Replace the `questions` read policy with `using (true)`, unchanged. Reviews of unpublished months must keep working (Review Focus 1). Browsing never lists questions of unpublished months, because queries go through `ca_months`, which RLS filters.

- [ ] **Step 1: Write the failing pgTAP test** `0006_current_affairs.test.sql`. Fixtures use slugs `zz-ca-*`, month `2099-01-01`, plus an unpublished `2099-02-01`. As a user (claims as in `0001`):
  - `ca_months` shows 1 row for the fixture section.
  - Notes of the unpublished month count 0.
  - `select correct_key from questions` still throws `42501`.
  - `select id, ca_month_id, ca_category_slug, retired from questions` works.
  - Inserting a question with both `topic_id` and `ca_month_id` throws `23514`, as does one with neither.
  - Inserting own `ca_progress` works; another user's throws `42501`.
  - Inserting into `ca_notes` as a user throws `42501`.
  - `ca_months` rejects `2099-01-15` with `23514`.
- [ ] **Step 2:** Run `npm run db:test`. Expected: FAIL (relations missing).
- [ ] **Step 3:** Write the migration. Then backfill: insert a `maths-reasoning` section (`kind 'topics'`, position 2) for every subject that has topics, and set `topics.section_id`.
- [ ] **Step 4:** Run `npx supabase migration up && npm run db:test` (expected: all pass), then `npm run db:types`.
- [ ] **Step 5:** Commit `feat(ca): schema for sections, months, notes and progress`.

---

### Task 3: Database functions for current affairs

**Files:**
- Create: `supabase/migrations/0008_current_affairs_fns.sql`, `supabase/tests/0007_period_tests.test.sql`

**Interfaces:**
- `create_period_test(p_from date, p_to date, p_categories text[] default null, p_count int default 10, p_seconds_per_question int default null) returns uuid`, `security definer`, `search_path = public`, execute granted to `authenticated` only.
  - Errors, raised as `P0001` with these exact messages:
    - not signed in;
    - `p_from > p_to` → `'Choose a valid period'`;
    - more than 12 months → `'Choose a period of 12 months or less'`;
    - `p_count` outside 5..50 → `'Choose between 5 and 50 questions'`;
    - nothing available → `'There are no questions for this period yet'`.
  - Draws from questions where `ca_month_id` is in a published month with `month between p_from and p_to`, `not retired`, and `p_categories is null or ca_category_slug = any(p_categories)`. Random order, up to `p_count`; fewer is allowed if fewer exist (Review Focus 3).
  - Inserts a test with `kind 'custom'`, `created_by = auth.uid()`, `subject_id` of the section's subject, `marks_correct 1`, `marks_wrong -0.33`, `duration_sec = p_seconds_per_question * <questions actually drawn>` (null = practice only), `published true`, `published_at now()`.
  - Title: `'Current affairs: ' ||` the range label (`to_char` gives 'Jan 2026', 'Jan–Mar 2026' or 'Nov 2026–Jan 2027', matching `formatRange`), then `' · ' ||` the category names joined with `', '` when there are 1–3 categories, or `' · N categories'` when there are more.
- `create_custom_test` is recreated to skip `retired` questions.
- `get_attempt` and `get_attempt_review` are recreated with `left join topics tp`, `left join ca_months m on m.id = q.ca_month_id` and `left join ca_categories c on c.slug = q.ca_category_slug`. The label is `topic_name = coalesce(tp.name, c.name || ' · ' || to_char(m.month, 'Mon YYYY'))`. Everything else in both functions stays identical to the current versions in `0002_attempts.sql` and `0004_independent_marks.sql`.

- [ ] **Step 1: Write the failing pgTAP test.** Fixtures: months `2099-01` with 6 Appointments questions and 2 Sports questions, `2099-02` with 3 Appointments questions, plus 1 retired Appointments question in `2099-01`. As a user:
  - `create_period_test('2099-01-01', '2099-02-01', null, 50)` makes a test with 11 questions (retired excluded), titled `'Current affairs: Jan–Feb 2099'`, with `marks_wrong = -0.33`.
  - With `array['sports']` and count 10: 2 questions, title ending `' · Sports'`.
  - `create_period_test('2099-02-01', '2099-01-01', …)` throws `'Choose a valid period'`.
  - A 13-month span throws `'Choose a period of 12 months or less'`.
  - Count 4 throws `'Choose between 5 and 50 questions'`.
  - An empty period (`2098-01`) throws `'There are no questions for this period yet'`.
  - `get_attempt` on a practice attempt of that test has `questions->0->>'topic_name'` like `'% · Jan 2099'` or `'% · Feb 2099'`.
  - Review Focus 1: unpublishing month `2099-01` after submitting an attempt still lets `get_attempt_review` return every question.
  - `create_custom_test` on the fixture topic excludes a retired topic question.
- [ ] **Step 2:** Run `npx supabase migration up && npm run db:test`. Expected: FAIL.
- [ ] **Step 3:** Write `0008`.
- [ ] **Step 4:** Run `npx supabase migration up && npm run db:test` (expected: PASS), then `npm run db:types`.
- [ ] **Step 5:** Commit `feat(ca): period tests and category labels in attempts`.

---

### Task 4: Content loader for sections and current affairs

**Files:**
- Modify: `lib/content/schema.ts`, `lib/content/load.ts`
- Create: `tests/fixtures/content-ca/**`, `tests/fixtures/content-ca-invalid/**`
- Test: `tests/unit/content-ca.test.ts`. The existing `content-load.test.ts` must stay green unchanged.

**Interfaces:**
- Schemas (`.strict()`):
  - `sectionsFile`: an array of `{slug, name, kind: 'topics' | 'current_affairs', position}`.
  - `topicFile` gains optional `section: slug`.
  - `categoriesFile`: an array of `{slug, name}` (the position is the list index).
  - `caNoteShape`: `{slug, category, date?: 'YYYY-MM-DD', note: text, angle?: text}`.
  - `caQuestionShape`: `questionShape` plus `category: slug`.
  - `caTestFile`: `{title, duration_min, questions: slug[] (min 1)}`.
- `ContentBundle` gains:
  - `sections: {subjectSlug, slug, name, kind, position}[]`
  - `categories: {slug, name, position}[]`
  - `months: {subjectSlug, sectionSlug, month: MonthKey, notes: {slug, categorySlug, happenedOn: string | null, body_md, angle_md: string | null, position}[]}[]`
- `TopicItem` gains `sectionSlug: string | null`.
- `QuestionItem` changes `topicRef: string` to `topicRef: string | null` and gains `caMonthRef: string | null` (`'gs/current-affairs/2026-01'`) and `categorySlug: string | null`.
- `TestItem` gains `caMonthRef: string | null`. A month paper becomes `{slug: 'ca-<section>-<YYYY-MM>', kind: 'mock', subjectSlug, year: null, durationSec: duration_min*60, marksCorrect: 1, marksWrong: -0.33, published: true, questionSlugs, caMonthRef}`.
- Loader rules:
  - If `<subject>/sections.yaml` exists, each `kind: current_affairs` section's folder is read as current affairs; other folders are topics.
  - A topic whose `section` is missing gets the subject's only `topics` section, or null when there are no sections.
  - A topic slug of `current-affairs` is an error.
  - Month folders must match `YYYY-MM`.
  - Note and question `category` must exist in that section's `categories.yaml`.
  - Note slugs must be unique per month. Question slugs stay globally unique (shared with topic questions).
  - Every `test.yaml` question slug must be one of that month's questions.
  - A note `date` must fall inside its month.

- [ ] **Step 1: Write the fixtures and the failing tests** (`content-ca.test.ts`).
  - **Valid fixture:** `gs` with `sections.yaml` (current-affairs at position 1, maths-reasoning at 2), one topic `percentages` with no `section` field and 2 questions, `current-affairs/categories.yaml` (appointments, awards, sports), month `2099-01` (4 notes, 6 questions, `test.yaml` with 5 slugs) and month `2099-02` (2 notes, 2 questions, no `test.yaml`).
  - The valid fixture loads to:
    - `sections.length === 2`
    - `topics[0].sectionSlug === 'maths-reasoning'`
    - `months.map(m => m.month)` equals `['2099-01', '2099-02']`
    - `months[0].notes[0]` equals `{slug: 'n1', categorySlug: 'appointments', happenedOn: '2099-01-14', body_md: '**A** appointed …', angle_md: 'Succeeds B', position: 1}`
    - the CA questions have `topicRef === null` and `caMonthRef === 'gs/current-affairs/2099-01'`
    - `tests` has one item with slug `'ca-current-affairs-2099-01'`, marks `1/-0.33` and `durationSec 1500`.
  - **Invalid fixture,** with one of each: month folder `2099-13`; a note with unknown category `weather`; a duplicate note slug; a note dated `2099-02-03` in month `2099-01`; a `test.yaml` slug from another month; and a topic named `current-affairs`. It throws `ContentError` with exactly 6 issues, whose messages respectively contain `2099-13`, `weather`, `duplicate`, `2099-02-03`, `not in this month` and `reserved`.
- [ ] **Step 2:** Run `npm test`. Expected: the new tests FAIL; the existing content tests PASS.
- [ ] **Step 3:** Implement the schema and loader changes.
- [ ] **Step 4:** Run `npm test`. Expected: all PASS.
- [ ] **Step 5:** Commit `feat(ca): content loader for sections and monthly current affairs`.

---

### Task 5: Content push for current affairs

**Files:**
- Modify: `lib/content/push.ts`, `scripts/content-push.ts`, `content/gs/sections.yaml` (new; real), `content/gs/current-affairs/categories.yaml` (new; real; the 16 categories from the spec, in that order)
- Test: extend `tests/unit/content-plan.test.ts` if helpers are extracted; the end-to-end checks are below.

**Interfaces:**
- `PushSummary` gains `sections`, `categories`, `months`, `notes`; `Counts` gains `removed` (notes deleted) and `retired` (questions retired), 0 elsewhere.
- Push order:
  1. subjects
  2. sections (upsert on `subject_id,slug`)
  3. topics, now setting `section_id`
  4. categories (upsert on `slug`)
  5. months (upsert on `section_id,month`, `published true`, `published_at` kept)
  6. notes (upsert on `month_id,slug`)
  7. lessons
  8. questions (topic or month/category; `retired false` for every question in the files)
  9. tests (including month papers with `ca_month_id`; the attempted-test guard applies)
- `--prune` also:
  - unpublishes months that are missing from the files;
  - deletes notes missing from a pushed month;
  - sets `retired = true` on questions missing from the files (never deletes them).

- [ ] **Step 1:** Push the valid fixture into local: `npm run content:push -- tests/fixtures/content-ca`. Expected: counts show sections 2, categories 3, months 2, notes 6, questions 10 (2 topic + 8 CA) and tests 1 created. A second run reports everything unchanged.
- [ ] **Step 2:** On a scratch copy of the fixture, edit one note's text and move one question to `awards`, then push. Expected: notes 1 updated, questions 1 updated, everything else unchanged.
- [ ] **Step 3:** On a scratch copy, remove one note, one question and month folder `2099-02`, then push with `--prune`.
  - Expected summary: notes removed 3 (1 + the 2 of 2099-02), questions retired 3 (1 + the 2 of 2099-02), months unpublished 1.
  - SQL check: the retired questions keep `retired = true`.
- [ ] **Step 4:** Start the fixture month paper as a user and submit it via SQL helpers. Then change its `test.yaml` order and push without `--force`. Expected: the existing "has attempts" refusal.
- [ ] **Step 5:** Push the real `content/`. Expected: sections 2 created, categories 16 created, topics 1 updated (`section_id`), and no months (there is no real month content yet).
- [ ] **Step 6:** Run `npm test && npm run db:test` (expected: PASS), then commit `feat(ca): push sections, categories, months, notes and month papers`.

---

### Task 6: Queries and actions

**Files:**
- Create: `lib/queries/current-affairs.ts`
- Modify: `app/(app)/actions.ts`, `lib/queries/content.ts` (`getSubject` returns sections)

**Interfaces:**
- `getSubject(slug)` adds `sections: {slug, name, kind, position}[]`. Topics gain `sectionSlug`.
- `listMonths(subjectSlug)` returns `{month: MonthKey, noteCount, questionCount, categoriesRead, categoriesWithNotes, hasPaper}[]`, newest first.
- `getMonth(subjectSlug, month: MonthKey)` returns `{month, monthId, categories: {slug, name, noteCount, questionCount, read}[] (only categories with notes or questions, in category order), paper: {testId, questionCount, durationSec, bestScore} | null} | null`.
- `getCategoryNotes(subjectSlug, month, categorySlug)` returns `{monthId, category: {slug, name}, notes: {slug, happenedOn, body_md, angle_md}[] (date, then position), read, prev: {slug, name} | null, next: {slug, name} | null, questionCount} | null`.
- `getPeriod(subjectSlug, period: Period)` returns `{period, months: MonthKey[] (published, within), categories: {slug, name, noteCount, questionCount}[]}`.
- `getPeriodNotes(subjectSlug, period, categorySlug)` returns `{category, groups: {month: MonthKey, notes: …}[]}`.
- Actions, which return `ActionResult` like the existing ones:
  - `startCaPractice({from, to, categories?: string[], count: number})` creates with `p_seconds_per_question null`, starts in `'practice'` and redirects.
  - `startCaRevision({from, to, categories?: string[], count: 25 | 50})` creates with `p_seconds_per_question 60`, starts in `'timed'` and redirects.
  - `markCategoryRead(monthId: string, categorySlug: string, read: boolean)` upserts or deletes `ca_progress` and revalidates.

- [ ] **Step 1:** Implement the queries and actions using `lib/periods.ts`. Months and dates are converted only through `monthToDate` and `dateToMonth`.
- [ ] **Step 2:** Run `npm run typecheck && npm run lint`. Expected: clean.
- [ ] **Step 3:** Commit `feat(ca): queries and actions`.

---

### Task 7: Subject page sections and the Current Affairs index

**Files:**
- Modify: `app/(app)/subjects/[subject]/page.tsx`
- Create: `app/(app)/subjects/[subject]/current-affairs/page.tsx`, `components/ca/month-card.tsx`, `components/ca/period-picker.tsx`

- [ ] **Step 1:** Subject page. Render sections in `position` order.
  - **Current Affairs section:** a PageHeader-style heading, the latest 3 month cards ("January 2026 · 96 notes · 120 questions" plus a "4/16 read" progress bar) and "All months & revision →".
  - **Maths & Reasoning section:** today's topic grid.
  - A subject with no sections renders exactly as today.
- [ ] **Step 2:** Index page (`/subjects/gs/current-affairs`).
  - The "Revise a period" panel (`PeriodPicker`) has:
    - `SegmentedControl` presets Last 3 / 6 / 12 months, ending at the latest month by default, with a month `<select>` to change the end;
    - pills for each `calendarPeriods` block;
    - a link to the period page.
  - Then every month as a card, newest first, grouped under year headings.
  - Empty state: "No months yet. New months appear here as soon as they're added."
- [ ] **Step 3:** Push the fixture, then check in Chrome at 360, 768 and 1280, light and dark: both sections show; the index lists 2099-01 and 2099-02; the picker links to `period?from=2098-11&to=2099-01` for "Last 3 months"; no horizontal overflow.
- [ ] **Step 4:** Commit `feat(ca): subject sections and current affairs index`.

---

### Task 8: Month page and category notes

**Files:**
- Create: `…/current-affairs/[month]/page.tsx`, `…/current-affairs/[month]/[category]/page.tsx`, `components/ca/category-row.tsx`, `components/ca/note-card.tsx`, `components/ca/ca-practice-buttons.tsx`, `…/[category]/mark-read.tsx`

- [ ] **Step 1:** Month page.
  - `notFound()` unless `isMonthKey(month)` and the month exists and is published.
  - Header: eyebrow "General Studies · Current Affairs", title `formatMonth`.
  - Paper panel: "January 2026 test · 25 questions · 25 min · +1 / −0.33", Start timed (the existing `StartActions`, with its confirm dialog) and Practice. Hidden when there's no paper.
  - Category rows: name, `Mono` counts, a read tick (`Badge` correct), "Read" (link) and "Practice" (`startCaPractice` with that category and `count: 10`; the function returns fewer when fewer exist). Practice is hidden when `questionCount === 0`.
  - A "Practise the whole month" button (25, untimed).
- [ ] **Step 2:** Category notes page.
  - Reader column (~70ch), `GlowBackdrop still`, eyebrow "January 2026 · Appointments".
  - Note cards: date in `Mono` (or none), the `Markdown` body with the bold key fact, and an `angle_md` muted line prefixed "↳".
  - Footer: `MarkRead` (optimistic, like `MarkDone`), "Practice this category" (primary), and previous / next category.
- [ ] **Step 3:** Chrome check on the fixture:
  - `/2099-13` and `/2099-02/weather` 404 (Review Focus 5).
  - Read a category and mark it read: the tick shows on the month page and the subject card says 1/3.
  - Category practice starts the runner, and its eyebrow reads "Question 1 of 6 · Appointments · Jan 2099".
  - The paper's Start timed shows a dialog with 5 questions and 25 min, then the runner.
  - Views at 360, 768 and 1280, light and dark.
- [ ] **Step 4:** Commit `feat(ca): month page and category notes`.

---

### Task 9: Period pages

**Files:**
- Create: `…/current-affairs/period/page.tsx`, `…/current-affairs/period/[category]/page.tsx`

- [ ] **Step 1:** Period page.
  - `parsePeriod(from, to)`; when it returns null, show a page with the `PeriodPicker` and "Choose a period".
  - Header: the label, plus `Mono` "N months · X notes".
  - Category rows across the period: Read (period notes), Practice (`startCaPractice` over the period with that category).
  - Revision panel: `SegmentedControl` 25 | 50, "Start timed revision" (`ConfirmDialog` with count, minutes and +1 / −0.33, then `startCaRevision`), and "Practise the period" (25, untimed).
- [ ] **Step 2:** Period notes page: notes grouped under month headings (newest month first), the same note cards, and no read ticks. Read ticks are per month; the rule is recorded in the spec.
- [ ] **Step 3:** Chrome check:
  - `period?from=2099-01&to=2099-02` shows both months' counts.
  - `period?from=2098-01&to=2099-06` is clamped to 12 months ending 2099-06, with a label like "Jul 2098–Jun 2099" (Review Focus 5).
  - Timed revision with 25 starts a runner titled "Current affairs: Jan–Feb 2099" containing 8 questions (all available) and a clock of 08:00 (1 min per question drawn).
  - Views at 360, 768 and 1280.
- [ ] **Step 4:** Commit `feat(ca): period overview, notes and revision tests`.

---

### Task 10: Study, New, Tests integration and docs

**Files:**
- Modify: `lib/queries/home.ts`, `app/(app)/study/page.tsx`, `app/(app)/new/page.tsx` (feed), `lib/queries/tests.ts` (labels), `README.md`

- [ ] **Step 1:** Study.
  - "Your progress" adds up to 3 Current Affairs rows for the latest months ("January 2026", categories read / categories with notes).
  - Continue order: open attempt → next unread category of the latest month (only if the person has read at least one category in any month) → next lesson.
  - The new branch is a pure function in `lib/home.ts`, `nextCaCategory(months, readByMonth)`, with unit tests:
    - it picks the first unread category of the newest month;
    - it returns null when nothing has been read yet;
    - it returns null when the newest month is fully read.
- [ ] **Step 2:** New feed. Each published month is one item: type `'month'`, the title "January 2026 current affairs", where "General Studies · Current Affairs", linking to the month page, with `isNew` until the person has read any category of it.
- [ ] **Step 3:** Tests tab. Month papers appear as mock tests. The list shows a small "Current affairs" badge when `ca_month_id` is set (`listTests` returns `isCurrentAffairs`).
- [ ] **Step 4:** README. Add a "Monthly current affairs" section: the folder layout, the note, question and `test.yaml` formats with examples, the categories file, what "live on push" and `--prune` do, and how periods work.
- [ ] **Step 5:** Full verification.
  - Run `npm test && npm run typecheck && npm run lint && npm run build && npm run db:reset && npm run db:test`. Expected: all pass.
  - Then a fresh-DB walkthrough in Chrome with the fixture pushed:
    1. sign up;
    2. Subjects → GS shows both sections;
    3. read a category and mark it read;
    4. category practice;
    5. the month paper, timed, submitted, then reviewed, with labels showing the category and month;
    6. period "Last 3 months" timed revision;
    7. Study shows the Current Affairs progress, and Continue points to the next unread category;
    8. the New feed shows the months;
    9. `--prune` removes month 2099-02, and the past attempt's review still opens (Review Focus 1).
- [ ] **Step 6:** Commit `feat(ca): study, feed and tests integration; docs`.
