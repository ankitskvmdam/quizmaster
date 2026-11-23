# QuizMaster

An invite-only web app for learning and practising General Studies maths and reasoning (CSAT / SSC style): short
lessons with maths, and multiple-choice tests taken against the clock or as untimed practice.

- **Stack:** Next.js 16 (App Router) · Supabase (Postgres, Auth) · Tailwind CSS v4 · shadcn/ui · KaTeX
- **Design:** [`DESIGN_DIRECTION.md`](DESIGN_DIRECTION.md) · **Spec:** [`docs/superpowers/specs/`](docs/superpowers/specs/)

## What's in the app

| Tab | What it does |
|---|---|
| **Study** | Home: continue a lesson or resume a test, progress per topic, recent attempts, quick practice |
| **Subjects** | Subject → topic → lessons. Mark lessons done; practise a topic |
| **Tests** | Mock tests: start timed (with negative marking) or practise with explanations as you go |
| **Past tests** | Previous-year papers, and every attempt you've taken with a full review |
| **New** | Build a custom test from topics; a feed of recently added lessons and tests |

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
npm run content:push              # loads content/ into the database
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

Everything lives in `content/` as Markdown and YAML, and `npm run content:push` copies it into Supabase.

```
content/
  gs/                                 # a subject (folder name = slug)
    subject.yaml                      # slug, name, description, position
    percentages/                      # a topic
      topic.yaml                      # slug, name, description, position
      01-basics.md                    # a lesson: frontmatter (slug, title, position) + Markdown
      questions.yaml                  # the topic's question bank
  tests/
    gs-percentages-mock-1.yaml        # kind: mock
    sample-pyq-2024.yaml              # kind: pyq (needs year)
```

**A question** (`questions.yaml` is a list of these):

```yaml
- slug: pct-001            # unique across all content
  difficulty: easy         # easy | medium | hard
  stem: What is $15\%$ of $240$?
  options: { A: "32", B: "36", C: "38", D: "42" }   # A, B, … in order, 2–6 options
  answer: B
  explanation: |
    $\dfrac{15}{100} \times 240 = 36$.
  source: Optional, e.g. "CSAT 2023 Q12"
  tags: [optional]
```

**A test:**

```yaml
slug: gs-percentages-mock-1
title: Percentages mock 1
kind: mock                 # mock | pyq
subject: gs
year: 2024                 # required for pyq
duration_min: 15           # omit for practice-only
marks: { correct: 2, wrong: -0.66 }
questions:
  - pct-001                # a question slug from any bank…
  - slug: pyq-2024-01      # …or a question written inline (needs topic: <subject>/<topic>)
    topic: gs/percentages
    # …same fields as a bank question
```

**Writing lessons:** use `##` and `###` headings, `$…$` and `$$…$$` for maths (inside YAML double quotes, write `\\%`
for a percent sign in maths). A blockquote that starts with bold text becomes a callout: `> **Example**`,
`> **Shortcut**`, and `> **Trap**` (shown in amber).

**Pushing:**

```bash
npm run content:push -- --dry     # check everything and show what would change; writes nothing
npm run content:push              # create/update by slug; unchanged rows are left alone
npm run content:push -- --prune   # also unpublish lessons/tests/subjects you deleted from the files
```

The push checks every file first: unknown answers, missing questions, duplicate slugs. If there's a problem, it lists
every one and writes nothing. It never deletes. `--prune` only unpublishes, because attempts may refer to old
questions.

## Tests

```bash
npm test          # unit tests (Vitest)
npm run db:test   # database tests (pgTAP): RLS, answer hiding, scoring, deadlines, the allowlist hook
npm run typecheck && npm run lint && npm run build
```

## Deploying with Supabase cloud

1. Create a project, then `npx supabase link --project-ref <ref>` and `npx supabase db push` to apply the migrations.
2. **Auth → Hooks:** add a *Before User Created* hook of type Postgres function → `public.hook_check_allowlist`.
3. **Auth → Providers → Email:** keep *Confirm email* on. Set the minimum password length to 8, with letters and
   digits required.
4. **Auth → URL configuration:** set the Site URL to your app's URL, and add `<site>/auth/confirm` to the redirect URLs.
5. **Auth → Email templates:** paste `supabase/templates/confirmation.html` into *Confirm signup* and
   `supabase/templates/recovery.html` into *Reset password*. They link to `/auth/confirm` with a token hash.
6. Set the four environment variables on your host (e.g. Vercel), with `NEXT_PUBLIC_SITE_URL` as the real URL.
7. Run `npm run invite` and `npm run content:push` with `.env.local` pointing at the cloud project.
