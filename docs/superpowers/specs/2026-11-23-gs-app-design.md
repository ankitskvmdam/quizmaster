# GS Math & Reasoning Practice App — Design + Build Plan

## Context
A private web app, shared with invited people, for learning and practising General Studies (GS) maths and reasoning (quantitative aptitude, CSAT/SSC style). There is a study section, and tests can be taken in timed or practice mode. The owner (or Claude) adds content from the command line rather than an admin UI. The app starts with only the GS subject, but more subjects will be added later, so subject is data, not code. `D:\projects\gs` is empty, so this is a new build.

**Decisions made with the user**
- Next.js frontend. Supabase handles the database and auth, using email and password.
- Sign-up is limited to an allowlist: only approved emails can create an account.
- Content is Markdown with maths (KaTeX). Lessons and question files live in `content/` and are pushed with `npm run content:push`.
- Tests have two modes. **Timed** has a countdown, optional negative marking and a score with explanations at the end. **Practice** shows the explanation after each answer.
- Tabs:
  - **Study** is home: continue where you left off, progress, and recent attempts.
  - **Subjects** lets you browse subject → topic → lessons.
  - **Tests** lists official mock tests.
  - **Past tests** holds previous-year papers (PYQs) plus my attempt history.
  - **New** has a "what's new" feed and a custom test builder.

**Non-goals (v1):** admin UI, payments, leaderboards or social features, a native mobile app, PDF support.
**Anti-goals:**
- Correct answers must not be readable in the browser before a timed test is submitted.
- Non-allowlisted emails must not be able to sign up by calling Supabase directly.

## Approaches (content pipeline)
- **Chosen: files plus a push script.** The repo's `content/` folder is the source of truth. The push script validates the files and copies them into Supabase. This gives version history, safe edits and an easy way for Claude to author content.
- Rejected: direct database writes only. Supabase would be the only copy, with no history and harder edits.
- Rejected: an admin UI. The user explicitly wants to work from the command line or through Claude.

## Design direction (replaces the ported `DESIGN_DIRECTION.md`)
The existing `D:\projects\gs\DESIGN_DIRECTION.md` was ported from another product and is full of references to that product:
- its brand, Slack, Linear and people;
- scan, QR, avatar and body-stats pages;
- the Emotion component library, organizations, Japanese i18n and 2FA.

**Step 0 of the build:** write a new `DESIGN_DIRECTION.md` dedicated to this app, then delete the old file. Keep the visual language and drop everything product-specific. I'll show you the new doc before building pages on it.

**What the new doc carries over (adapted)**
- **Premise:** a calm, focused study tool. On every screen, the question and its figures are the loudest thing.
- **How it's built:** Tailwind + shadcn/ui. Every colour, radius and shadow is a CSS variable in `app/globals.css`, with light values on `:root` and dark values on `:root[data-theme='dark']`. Tailwind's theme maps to those variables, and shadcn components read them. Never hard-code a hex value.
- **Palette:**
  - Canvas: flat light grey `#f5f7f7`, or near-black teal `#0f1514` in dark mode.
  - Panels: white with a `#e3e8e7` hairline.
  - Text: `#1b2423`, with `#5f6b69` for muted text.
  - Primary: teal `#2f7d72`, or `#4fb3a4` in dark mode.
  - Accents: mint tints.
  - Status: correct = green, review/attention = amber, wrong = red, skipped = neutral.
  - Text and primary pairs must pass WCAG AA in both themes.
- **Theme:** System (default), Light or Dark from a `ThemeSwitcher`, saved in `localStorage`. An inline head script prevents a flash on load.
- **Type:**
  - Hanken Grotesk for text.
  - JetBrains Mono with `tabular-nums` for every figure: scores, timer, question numbers, percentages, dates and small uppercase eyebrows.
  - KaTeX maths sits inline with body text.
- **Shapes:**
  - Radius 10px for inputs and tiles, 24px for panels, 32px for the auth card and modals.
  - Buttons are pills. Primary is a solid teal fill; secondary is glass.
- **Backdrop:** a faint drifting glow behind pages, held still on the test runner so nothing moves during a timed test. Motion respects `prefers-reduced-motion`.
- **App shell:**
  - A header with the app mark, `ThemeSwitcher` and account menu.
  - Content centred at 72rem.
  - A floating **BottomDock** as the main navigation, with 5 items: Study, Subjects, Tests, Past tests and New. This keeps the ported "no sidebar" rule.
  - The test runner hides the dock and shows its own bar instead: timer, question palette and Submit.
- **Screens:**
  - **Study home:** a greeting, a Continue card, topic progress and recent attempts.
  - **Subjects → topic → lesson:** a readable column of about 70ch with KaTeX.
  - **Tests and Past lists:** a dense table inside a panel, with mono numbers.
  - **Runner:** question stem, options as large tappable cards, and a palette of numbered pills in states answered, marked, current and unvisited.
  - **Review:** your answer vs the correct one, plus the explanation.
  - **New:** a feed plus a custom test builder.
- **Components and patterns** to keep:
  - Surfaces: `Panel`, `SoftPanel`, `IconTile`, `Mono`, `Eyebrow`, `Badge` with a dot.
  - States: `EmptyState`, `Skeleton`/`Spinner`, `SectionError` with retry, `PageHeader`.
  - Modals: `ConfirmDialog` is used for Submit test and Leave test. All modals are frosted glass with no header bar.
  - Forms: label above the field, error under it, and a `SubmitButton` with a busy state.
  - Accessibility: a visible focus ring, and colour never carries meaning on its own.
- **Auth layout:** glow backdrop and the brand with a tagline above the auth card, plus `PasswordRules` on sign-up.
- **Dropped:** scan flow, QR, 3D avatar, body stats, organizations and members, i18n and Japanese fonts, 2FA, legal footer links, Emotion, and all of the old product's names and links.

## Stack (my calls)
- Next.js 15 (App Router, TypeScript, Server Actions), Tailwind and shadcn/ui, themed per `DESIGN_DIRECTION.md`.
- `@supabase/ssr` for cookie sessions and `middleware.ts` route protection.
- `react-markdown`, `remark-math`, `rehype-katex` and `remark-gfm` for content rendering.
- Supabase CLI migrations in `supabase/migrations/`. These run against local Supabase (Docker) or the linked cloud project.
- Content CLI written in TypeScript and run with `tsx`, using `zod`, `yaml` and `gray-matter`.
- Vitest for unit tests.

## Data model (`supabase/migrations/0001_init.sql`)
- `allowed_emails(email citext pk, note, added_at)`
- `profiles(id → auth.users, display_name, created_at)`, created by a trigger on signup.
- `subjects(id, slug uniq, name, description, position, published)`
- `topics(id, subject_id, slug, name, description, position)` with uniq(subject_id, slug)
- `lessons(id, topic_id, slug, title, body_md, position, published_at, updated_at)`
- `questions(id, slug uniq, topic_id, stem_md, options jsonb [{key,text_md}], correct_key, explanation_md, difficulty, source, tags text[])`
- `tests(id, slug uniq, title, kind enum(mock|pyq|custom), subject_id, year, duration_sec, marks_correct, marks_wrong, created_by null|uuid, published_at)`
- `test_questions(test_id, question_id, position)`
- `attempts(id, user_id, test_id, mode enum(timed|practice), started_at, deadline_at, submitted_at, score, n_correct, n_wrong, n_skipped)`
- `attempt_answers(attempt_id, question_id, selected_key, is_correct, answered_at)` with pk(attempt_id, question_id)
- `lesson_progress(user_id, lesson_id, completed_at)`

**Security: Row-Level Security (RLS) and Postgres functions**
- Signed-in users can read content tables. Only the service role (the push script) can write to them.
- Column grants hide `questions.correct_key` and `explanation_md` from the `authenticated` role.
- Users can read and write only their own `attempts`, `attempt_answers` and `lesson_progress` rows. Custom tests are visible only to their `created_by` user.
- Answer checking and scoring run as `SECURITY DEFINER` Postgres functions:
  - `start_attempt(test_id, mode)` sets `deadline_at` when the mode is timed.
  - `save_answer(attempt_id, qid, key)` records an answer. In practice mode it returns `{is_correct, correct_key, explanation_md}`. In timed mode it returns nothing and rejects answers after `deadline_at` + a 30 s grace period.
  - `submit_attempt(attempt_id)` scores the attempt with `marks_correct` and `marks_wrong` and stamps `submitted_at`. It is idempotent.
  - `get_attempt_review(attempt_id)` returns the questions with answers and explanations, only for the owner and only after submission.
  - `create_custom_test(topic_ids[], count, duration_sec)` picks random questions and creates a `kind=custom` test.
- Allowlist enforcement uses a Supabase **Before User Created auth hook**: a Postgres function `hook_check_allowlist` rejects emails not in `allowed_emails`. The sign-up form also pre-checks so it can show a friendly error. The hook has to be enabled once in the dashboard (or `config.toml` locally).

## App structure
```
app/
  (auth)/login, signup, forgot-password, reset-password   # email+password, email confirm
  auth/confirm/route.ts                                    # verifies OTP/token_hash
  (app)/layout.tsx           # header + BottomDock: Study | Subjects | Tests | Past tests | New
  (app)/study                # continue lesson, topic progress bars, recent attempts
  (app)/subjects/[subject]/[topic]/[lesson]               # browse + read lesson, "mark done", "practice this topic"
  (app)/tests                # mock tests → Start timed / Start practice
  (app)/past                 # PYQ papers list + "My attempts" history
  (app)/past/attempts/[id]   # review: your answer vs correct, explanations, score
  (app)/new                  # What's new feed (published_at desc) + custom test builder
  (app)/attempt/[id]         # runner: question nav palette, timer, mark-for-review, submit
lib/supabase/{server,client,middleware}.ts
components/Markdown.tsx      # KaTeX-enabled renderer (shared by lessons/questions)
middleware.ts                # refresh session; redirect unauthenticated → /login
```
The timer shows `deadline_at` from the server and auto-submits at zero. The server enforces the deadline regardless of what the browser does.

## Content CLI
```
content/gs/subject.yaml
content/gs/<topic>/topic.yaml
content/gs/<topic>/NN-<slug>.md        # frontmatter: slug,title,position + markdown body
content/gs/<topic>/questions.yaml      # list of MCQs (slug, stem, options, answer, explanation, difficulty, source)
content/tests/<slug>.yaml              # kind: mock|pyq, duration, marking, questions: [slug refs or inline w/ topic]
```
- `scripts/content-push.ts` (`npm run content:push [-- --dry] [-- --prune]`):
  - Validates every file with zod and checks that every question reference resolves.
  - Upserts by slug in dependency order using `SUPABASE_SERVICE_ROLE_KEY` from `.env.local`.
  - Prints a summary of what was created, updated and left unchanged.
  - Never deletes unless `--prune` is passed.
- `scripts/invite.ts`: `npm run invite -- a@b.com [more]` adds emails to `allowed_emails`. `npm run invite -- --list` shows the list.
- Seed content: GS subject → topic "Percentages" with 1–2 lessons and about 15 questions, one timed mock test, and one sample PYQ-format paper. This proves the whole flow end to end.

## Build order
0. Write the new `DESIGN_DIRECTION.md` for this app, delete the ported one, and get your OK on it.
1. Scaffold Next.js, Tailwind, shadcn, Supabase clients, middleware and `.env.example`.
2. Migration: schema, RLS, grants, functions and the allowlist hook. Add `supabase/seed.sql` for local development.
3. Auth pages: sign-up with the allowlist pre-check, login, email confirmation and password reset.
4. Content CLI, invite CLI and seed content.
5. Subjects browsing, the lesson reader with KaTeX, and lesson progress.
6. Test runner (timed and practice), submission and the review page.
7. Tabs: Study home, Tests, Past (PYQ and history), New (feed and custom builder).
8. Polish: responsive layout, empty states and loading states.

After approval, I'll save this design to `docs/superpowers/specs/2026-11-23-gs-app-design.md` and expand it into a step-by-step implementation plan.

## Verification
- `npx vitest`: unit tests for the content zod schemas, reference resolution and score calculation (including negative marking).
- `supabase start` and `supabase db reset` to apply the migration and seed locally (needs Docker; otherwise link a cloud project).
- SQL checks against the database:
  - Sign-up with a non-allowlisted email is rejected by the hook.
  - Selecting `correct_key` as `authenticated` fails.
  - `save_answer` after the deadline is rejected.
  - One user cannot read another user's attempt.
- `npm run content:push -- --dry`, then a real push. Running the push twice should report everything as unchanged.
- `npm run dev`, then walk through the app in the browser:
  - Invite an email, sign up, confirm and log in.
  - Read a lesson and mark it done.
  - Take a timed mock and let it auto-submit, then check the score and review.
  - Run a practice attempt and check the explanation appears after each answer.
  - Build a custom test from the New tab.
  - Check that Past shows the PYQ paper and the attempt history.
- `npm run build` must pass, along with a type check and lint.

## Open items for the user (not blocking)
- You need a Supabase project with its URL and anon and service keys in `.env.local`. Local development also needs Docker.
- Hosting (for example Vercel) is a later step.
