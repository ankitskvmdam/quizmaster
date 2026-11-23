# QuizMaster

An invite-only web app for learning and practising BPSC-level General Studies: a syllabus tree of short notes with
practice MCQs per subject (History, Civics, Geography, Economics), plus book gists with an end-of-chapter quiz.

- **Stack:** Next.js 16 (App Router) · Supabase (Postgres, Auth) · Tailwind CSS v4 · shadcn/ui · KaTeX
- **Design:** [`DESIGN_DIRECTION.md`](DESIGN_DIRECTION.md) · **Spec:** [`docs/superpowers/specs/`](docs/superpowers/specs/)

## What's in the app

| Tab | What it does |
|---|---|
| **Study** | Home: continue a note, chapter or test, progress per subject, recent attempts, quick practice |
| **Courses** | Course → subject → sections (any depth) → notes. Mark notes done; practise any branch; read book chapters and take their quizzes |
| **Tests** | Mock tests: start timed (with negative marking) or practise with explanations as you go |
| **Past tests** | Previous-year papers, and every attempt you've taken with a full review |
| **New** | Build a custom test from subjects and sections; a feed of recently added notes, books and tests |

Answers never reach the browser during a timed test. Scoring, deadlines and answer checks run in Postgres functions
(`supabase/migrations/0002_attempts.sql`). Signed-in users can't read `questions.correct_key` or `explanation_md`.

## Local setup

You need Node 20.9+ and Docker.

```bash
npm install
cp .env.example .env.local        # then fill it in from the next command
npm run db:start                  # local Supabase; prints the anon and service-role keys
npm run db:reset                  # applies migrations
npm run invite -- you@example.com # only invited emails can sign up
npm run dev:seed                  # demo@quizmaster.test / Demo1234 + the mock content (local only)
npm run dev                       # http://localhost:3000
```

Local Supabase uses its own ports, so it can run beside another project: API `55321`, DB `55322`, Studio `55323`.
Sign-up confirmation emails land in Mailpit at http://127.0.0.1:55324.

### Environment variables

| Name | What |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon (publishable) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key. **Server-only.** Used only by the `invite` and `content:push` CLIs |
| `NEXT_PUBLIC_SITE_URL` | Where the app runs, for email links (`http://localhost:3000` locally) |

## Adding people

```bash
npm run invite -- asha@example.com ravi@example.com   # invite
npm run invite -- --list                              # who is invited
npm run invite -- --remove asha@example.com           # un-invite (existing accounts keep working)
```

Sign-up is enforced server-side by a Supabase **Before User Created** auth hook, `public.hook_check_allowlist`. An
email that isn't on the list gets "This email hasn't been invited yet…" under the email field, whatever the client
does. Case doesn't matter.

## Content

Content lives in files and `npm run content:push` copies it into Supabase. **The full format — nodes, notes,
questions, books, chapter gists and quizzes, plus rules for AI-written content — is in
[`docs/content-format.md`](docs/content-format.md).**

```
content/        # real content; pushed to production. Today: the General Studies skeleton (no notes yet)
content-mock/   # [MOCK] notes, questions and a sample book for local screens only. Never push it to the cloud
```

**Glossary.** The app says *course → subject → section*; the database keeps older names: a course is a row in
`subjects`, and subjects and sections are rows in `topics` (a subject is a topic with no parent; `path` is its folder
path, e.g. `history/ancient/india`). Books live in `books`, `book_chapters` and `chapter_topics` (a chapter's
`covers` tags); a chapter quiz is a `tests` row of kind `chapter`.

**Tests and previous-year papers** (`content/tests/*.yaml`, kind `mock` or `pyq`) still work as before; inline
questions name their node as `topic: <course>/<path>`, e.g. `gs/history/modern/india`.

**Current affairs** code is kept but dormant (no section is pushed); it will move to month-wise books later.

**Pushing:**

```bash
npm run content:push -- --dry                 # check everything and show what would change; writes nothing
npm run content:push                          # create/update by slug; unchanged rows are left alone
npm run content:push -- --prune               # also unpublish lessons/tests/books you deleted from the files
npm run content:push -- content-mock          # push another folder (local mock content)
```

The push checks every file first: unknown answers, missing questions, duplicate slugs, bad `covers` paths, chapters
without `## Gist` / `## Key facts`. If there's a problem, it lists every one and writes nothing. It never deletes;
`--prune` only unpublishes, because attempts may refer to old questions. A test or chapter quiz someone has attempted
keeps its question list unless you pass `--force`.

**Starting over** (deletes all content and every attempt; keeps users, profiles and the invite list):

```bash
npm run content:wipe            # shows row counts only
npm run content:wipe -- --yes   # deletes
```

## Tests

```bash
npm test          # unit tests (Vitest)
npm run db:test   # database tests (pgTAP): RLS, answer hiding, scoring, deadlines, the allowlist hook, trees, books
npm run test:integration   # content push/wipe against local Supabase — runs `supabase db reset` first (wipes local data, incl. the demo user; run `npm run dev:seed` after)
npm run typecheck && npm run lint && npm run build
```

## Deploying with Supabase cloud

1. Create a project, then `npx supabase link --project-ref <ref>` and `npx supabase db push --linked` to apply the migrations.
2. **Auth → Hooks:** add a *Before User Created* hook of type Postgres function → `public.hook_check_allowlist`.
3. **Auth → Providers → Email:** keep *Confirm email* on. Set the minimum password length to 8, with letters and
   digits required.
4. **Auth → URL configuration:** set the Site URL to your app's URL, and add `<site>/auth/confirm` to the redirect URLs.
5. **Auth → Email templates:** paste `supabase/templates/confirmation.html` into *Confirm signup* and
   `supabase/templates/recovery.html` into *Reset password*. They link to `/auth/confirm` with a token hash.
6. Set the four environment variables on your host (e.g. Vercel), with `NEXT_PUBLIC_SITE_URL` as the real URL.
7. Put the cloud URL and service-role key in a git-ignored `.env.cloud` (never on the host), then run the CLIs with it,
   e.g. `npx tsx --env-file=.env.cloud scripts/content-push.ts`. Never push `content-mock/` to the cloud.
