# QuizMaster Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build QuizMaster: an invite-only Next.js + Supabase web app for studying GS maths and reasoning, with Markdown lessons and timed or practice MCQ tests. Content is pushed from a `content/` folder by a CLI.

**Architecture:** A Next.js App Router app (server components plus server actions) talks to Supabase through `@supabase/ssr`. The security-sensitive logic lives in Postgres: Row-Level Security (RLS), column grants that hide answers, and `SECURITY DEFINER` functions for attempts and scoring. An auth hook enforces the invite allowlist. Content is authored as YAML and Markdown in `content/`, validated with zod and upserted by a `tsx` CLI using the service-role key.

**Tech Stack:**
- Next.js (latest stable, App Router, TypeScript), Tailwind CSS v4, shadcn/ui, lucide-react
- `@supabase/supabase-js`, `@supabase/ssr`, and the Supabase CLI (`npx supabase`, v3.x) with local Docker
- react-markdown, remark-gfm, remark-math, rehype-katex, katex
- zod, yaml, gray-matter, tsx
- Vitest for unit tests; pgTAP via `supabase test db` for database tests

**Spec:** `docs/superpowers/specs/2026-11-23-gs-app-design.md` and `DESIGN_DIRECTION.md` (UI rules; every UI task follows it).

## Global Constraints

- App name and tagline come only from `lib/brand.ts`: `name: 'QuizMaster'`, `tagline: 'Maths and reasoning for General Studies, one question at a time.'`
- Colours, radii and shadows are only tokens from `app/globals.css`. Do not use hex values, `bg-white` or the raw Tailwind palette in components (DESIGN_DIRECTION "How it is built").
- Every figure (score, timer, counts, dates, marks) is rendered with `Mono` (JetBrains Mono, `tabular-nums`).
- Buttons are pills and come from variants only; never set a radius, background or border on a button with `className`.
- The theme preference key in `localStorage` is `gs.theme`. Values are `system | light | dark`, default `system`. `data-theme` is set on `<html>` before first paint.
- `correct_key` and `explanation_md` must never reach the browser for a timed attempt before it is submitted.
- Sign-up is rejected server-side, by the Supabase "before user created" hook, for emails not in `allowed_emails`. The UI error on the email field is exactly: "This email hasn't been invited yet. Ask the person who shared this link to add you."
- Passwords: at least 8 characters, with at least one letter and one number.
- A timed `save_answer` is accepted until `deadline_at + 30 seconds`.
- Option keys are consecutive capital letters starting at `A`, with 2–6 options per question.
- Marks are stored signed: `marks_correct > 0`, `marks_wrong <= 0`. Score = `n_correct * marks_correct + n_wrong * marks_wrong`. Skipped questions score 0.
- If Next.js is 16 or later, route protection lives in `proxy.ts` exporting `proxy`; on 15 it is `middleware.ts` exporting `middleware`. Use whichever the installed version expects.
- Because of the column grants on `questions`, app code always lists the columns it wants (`select('id, stem_md, options')`) and never uses `select('*')` on that table.
- Deviation from the spec, decided while planning: the sign-up form does **not** check the allowlist before submitting, because a public "is this email invited?" check would leak who is on the list. It relies on the hook's 403 and maps it onto the email field (Task 5).
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never commit `.env.local`.

## Review Focus

1. **Refresh or a second tab mid-timed-test.** The attempt resumes with the saved answers, marks and the same server deadline. The clock never resets. Tested in Task 3 (`start_attempt` returns the existing open attempt) and Task 9 (the runner uses `deadline_at - server_now`).
2. **Timer reaches zero while offline, or the tab sleeps.** The next load of an expired, unsubmitted attempt submits it and shows the review. Answers saved after the grace period are rejected. Tested in Task 3 (`get_attempt` auto-submits an expired attempt; `save_answer` after the deadline raises an error).
3. **A signed-in user reads answers directly through the Supabase REST API.** `select correct_key from questions` is denied, and `get_attempt` omits `correct_key` for timed attempts. Tested in Task 2 and Task 3.
4. **Content push run twice, or after editing one question.** The second run reports everything unchanged. An edit updates exactly that row. A typo in `answer:` or a dangling test reference fails validation before anything is written. Tested in Task 6.
5. **An invited email in different case, e.g. `Asha@Mail.com` invited as `asha@mail.com`.** Sign-up is allowed (the column is `citext`). Tested in Task 4.

---

## File Structure

```
app/
  layout.tsx                  # fonts, KaTeX css, theme head script, <html data-theme>
  globals.css                 # tokens (light/dark) + @theme inline mapping
  page.tsx                    # redirect → /study
  (auth)/layout.tsx           # glow backdrop, brand, AuthCard, ThemeSwitcher
  (auth)/login/page.tsx, signup/page.tsx, forgot-password/page.tsx, reset-password/page.tsx
  (auth)/actions.ts           # signIn, signUp, requestReset, updatePassword, signOut
  auth/confirm/route.ts       # verifyOtp(token_hash, type) → redirect next
  (app)/layout.tsx            # AppShell (header + BottomDock)
  (app)/study/page.tsx
  (app)/subjects/page.tsx, [subject]/page.tsx, [subject]/[topic]/page.tsx, [subject]/[topic]/[lesson]/page.tsx
  (app)/tests/page.tsx
  (app)/past/page.tsx, past/attempts/[id]/page.tsx
  (app)/new/page.tsx
  (app)/actions.ts            # startTest, startTopicPractice, createCustomTest, markLessonDone
  attempt/[id]/page.tsx       # runner: outside (app) so no dock/header
components/
  ui/                         # shadcn (button, dialog, input, label, checkbox, tooltip, popover, sheet, skeleton) restyled
  surfaces.tsx badge.tsx icon-button.tsx page-header.tsx stat-tile.tsx progress-bar.tsx data-table.tsx
  segmented-control.tsx empty-state.tsx loading.tsx section-error.tsx confirm-dialog.tsx
  submit-button.tsx form-field.tsx password-rules.tsx auth-form.tsx glow-backdrop.tsx
  theme-switcher.tsx markdown.tsx
  app-shell/{app-shell,app-mark,bottom-dock,account-menu}.tsx
  runner/{runner,top-bar,question-view,option-card,palette,explanation}.tsx
lib/
  brand.ts theme.ts format.ts validation.ts auth-errors.ts
  supabase/{server,client,admin,session}.ts  database.types.ts (generated)
  content/{schema,load,plan,push}.ts
  runner/{palette,timer}.ts
  queries/*.ts                # typed read helpers used by pages
proxy.ts | middleware.ts
scripts/content-push.ts scripts/invite.ts
content/gs/subject.yaml, content/gs/percentages/{topic.yaml,01-basics.md,02-successive-change.md,questions.yaml}
content/tests/{gs-percentages-mock-1.yaml,sample-pyq-2024.yaml}
supabase/config.toml  migrations/0001_schema.sql  migrations/0002_attempts.sql  migrations/0003_allowlist_hook.sql
supabase/templates/{confirmation,recovery}.html  supabase/seed.sql  supabase/tests/*.test.sql
tests/unit/*.test.ts
```

---

### Task 1: Scaffold, tokens, theme and base UI

**Files:**
- Create: the Next.js app in the repo root (keep `LICENSE`, `DESIGN_DIRECTION.md` and `docs/`), `app/globals.css`, `app/layout.tsx`, `lib/brand.ts`, `lib/theme.ts`, `components/theme-switcher.tsx`, `components/glow-backdrop.tsx`, `components/surfaces.tsx`, `components/badge.tsx`, `components/icon-button.tsx`, `components/ui/button.tsx` (restyled), `vitest.config.ts`, `.env.example`, `.gitignore` (includes `.env*.local`)
- Test: `tests/unit/theme.test.ts`

**Interfaces:**
- Produces:
  - `BRAND: { name: string; tagline: string }`
  - `type ThemePreference = 'system'|'light'|'dark'`
  - `THEME_STORAGE_KEY = 'gs.theme'`
  - `parsePreference(raw: string|null): ThemePreference`
  - `resolveTheme(pref: ThemePreference, systemDark: boolean): 'light'|'dark'`
  - `themeHeadScript: string` (inline IIFE)
  - Components: `Panel`, `SoftPanel`, `IconTile`, `Mono`, `Eyebrow`, `AccentText`, `Badge({tone?: 'neutral'|'primary'|'correct'|'wrong'|'review'|'skipped', dot?: boolean})`, `IconButton`, `GlowBackdrop({still?: boolean})`, `ThemeSwitcher`
  - `Button` with variants `primary | secondary | ghost | destructive` and sizes `default (40px) | lg (48px) | icon`
  - Tailwind names for every token in the DESIGN_DIRECTION table, including the answer states: `bg-correct`, `border-correct-border`, `text-correct-fg`, and the same for `wrong`, `review` and `skipped`

- [ ] **Step 1:** Run `npx create-next-app@latest . --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm` (if it refuses because the folder isn't empty, scaffold into `tmp-app/` and move the files up). Then `npx shadcn@latest init`, add the components listed above, and install `lucide-react`, `vitest` and `@vitejs/plugin-react`. Add these scripts: `typecheck: tsc --noEmit`, `test: vitest run`.
- [ ] **Step 2: Write the failing test** `tests/unit/theme.test.ts`:
```ts
expect(parsePreference(null)).toBe('system'); expect(parsePreference('bogus')).toBe('system'); expect(parsePreference('dark')).toBe('dark')
expect(resolveTheme('system', true)).toBe('dark'); expect(resolveTheme('system', false)).toBe('light'); expect(resolveTheme('light', true)).toBe('light')
expect(themeHeadScript).toContain('gs.theme')
```
- [ ] **Step 3:** Run `npm test`. Expected: FAIL (module not found).
- [ ] **Step 4:** Implement `lib/theme.ts` and `lib/brand.ts`. Write `globals.css` with every token from the DESIGN_DIRECTION tables (light on `:root`, dark on `:root[data-theme='dark']`), the `@theme inline` mapping, and shadcn's variables aliased to our tokens.
  - `app/layout.tsx` loads Hanken Grotesk and JetBrains Mono through `next/font/google` as `--font-sans` and `--font-mono`, imports `katex/dist/katex.min.css`, and injects `themeHeadScript` in `<head>` with `suppressHydrationWarning` on `<html>`.
  - `ThemeSwitcher` cycles system → light → dark, writes `localStorage`, and listens to `matchMedia` while on system.
  - `GlowBackdrop` is 4 blurred fixed circles on 19–26 s keyframes, disabled when `still` is set or under `prefers-reduced-motion`.
- [ ] **Step 5:** Run `npm test && npm run typecheck && npm run build`. Expected: all pass.
- [ ] **Step 6:** Commit with the message `feat: scaffold QuizMaster with tokens, theme and base UI`.

---

### Task 2: Database schema, RLS and grants

**Files:**
- Create: `supabase/config.toml` (from `npx supabase init`), `supabase/migrations/0001_schema.sql`, `supabase/tests/0001_schema.test.sql`, `supabase/seed.sql` (empty except comments), `lib/supabase/database.types.ts` (generated)
- Modify: `package.json` scripts: `db:start: supabase start`, `db:reset: supabase db reset`, `db:test: supabase test db`, `db:types: supabase gen types typescript --local > lib/supabase/database.types.ts`

**Interfaces:**
- Produces the tables in the spec's Data model, with these exact details:
  - Extensions: `citext`, `pgtap` (for tests).
  - Enums: `test_kind ('mock','pyq','custom')`, `attempt_mode ('timed','practice')`, `difficulty ('easy','medium','hard')`.
  - `subjects`: `published bool default true`.
  - `lessons`: `published bool default true`, `published_at timestamptz`.
  - `tests`: `published bool default true`, `published_at timestamptz`, `duration_sec int null` (null = practice only), `marks_correct numeric not null default 1 check (>0)`, `marks_wrong numeric not null default 0 check (<=0)`.
  - `questions.options jsonb` holds an array of `{key, text_md}`.
  - `attempt_answers`: adds `marked bool not null default false` and `checked bool not null default false` (practice lock).
  - `attempts`: `score numeric`, `n_correct`, `n_wrong` and `n_skipped int` (null until submitted).
  - `allowed_emails.email citext primary key`.
  - `profiles` are created by an `after insert on auth.users` trigger, with `display_name = split_part(email,'@',1)`.
- RLS on every table.
  - `authenticated` can select:
    - `subjects`, `topics` and `lessons` where published;
    - `questions` through column grant only: `id, slug, topic_id, stem_md, options, difficulty, source, tags` (no `correct_key`, no `explanation_md`);
    - `tests` where (`created_by is null and published`) or `created_by = auth.uid()`;
    - `test_questions` whose test is visible;
    - their own `attempts`, `attempt_answers`, `lesson_progress` and `profiles`.
  - `authenticated` can insert, update and delete their own `lesson_progress`, and update their own `profiles.display_name`.
  - Every other write goes through `service_role` or a function from Task 3.
  - `anon` gets nothing. `allowed_emails` has RLS on and no policies.

- [ ] **Step 1: Write the failing pgTAP test** `supabase/tests/0001_schema.test.sql`. It creates two users in `auth.users` (both emails in `allowed_emails` first, because Task 4's hook only runs through the Auth API and not on direct inserts). It seeds one subject, topic, lesson, question and test as postgres, then switches with `set local role authenticated; set local request.jwt.claims to '{"sub":"<user1>","role":"authenticated"}'`.
  - `select throws_ok($$select correct_key from questions$$, '42501')`
  - `select lives_ok($$select id, stem_md, options from questions$$)`
  - `select is((select count(*) from subjects), 1::bigint)`
  - User 2's `lesson_progress` row is invisible to user 1, and inserting one for user 2 as user 1 throws `42501`.
  - An unpublished lesson is invisible.
  - A custom test owned by user 2 is invisible to user 1.
  - As `anon`, `select count(*) from subjects` = 0.
- [ ] **Step 2:** Run `npm run db:start` (Docker), then `npm run db:test`. Expected: FAIL (relations missing).
- [ ] **Step 3:** Write `0001_schema.sql` as specified above.
- [ ] **Step 4:** Run `npm run db:reset && npm run db:test`. Expected: all pass. Then run `npm run db:types`.
- [ ] **Step 5:** Commit with the message `feat(db): schema, RLS and answer-hiding grants`.

---

### Task 3: Attempt functions (start, get, save, submit, review, custom tests)

**Files:**
- Create: `supabase/migrations/0002_attempts.sql`, `supabase/tests/0002_attempts.test.sql`
- Modify: `lib/supabase/database.types.ts` (regenerate)

**Interfaces:**
- All functions are `language plpgsql security definer set search_path = public`, granted execute to `authenticated` only, and raise `P0001` with a clear message when the caller is not the owner.
- `start_attempt(p_test_id uuid, p_mode attempt_mode) returns uuid`
  - Fails if the test isn't visible to the caller, or if mode is timed and `duration_sec` is null.
  - If the caller has an unsubmitted attempt for the same test and mode that isn't past `deadline_at + 30s`, it returns that attempt (resume).
  - Otherwise it inserts a new attempt with `deadline_at = now() + duration_sec` (timed) or null (practice).
- `get_attempt(p_attempt_id uuid) returns jsonb`
  - If the attempt is timed, unsubmitted and past `deadline_at + 30s`, it first calls `submit_attempt`.
  - Returns:
    ```
    { attempt:{id,mode,started_at,deadline_at,submitted_at}, server_now,
      test:{id,title,kind,duration_sec,marks_correct,marks_wrong},
      questions:[{id,position,topic_name,stem_md,options,selected_key,marked,
                  result: null | {is_correct,correct_key,explanation_md}}] }
    ```
  - `result` is non-null only when (`mode = 'practice'` and `checked`) or the attempt is submitted.
- `save_answer(p_attempt_id uuid, p_question_id uuid, p_selected_key text, p_marked boolean default false) returns jsonb`
  - Upserts `attempt_answers`.
  - Raises an error if the attempt is submitted, if it's timed and `now() > deadline_at + 30s`, if the question isn't in the test, if the key isn't one of the question's option keys (null is allowed, meaning clear), or if mode is practice and the row is already `checked`.
  - Timed: returns `null`.
  - Practice with a non-null key: sets `checked = true`, `is_correct`, and returns `{is_correct, correct_key, explanation_md}`.
  - Practice with a null key (marking only): returns `null`.
- `submit_attempt(p_attempt_id uuid) returns jsonb`
  - Idempotent: a second call returns the same totals unchanged.
  - Sets `is_correct` on every answer, computes `n_correct`, `n_wrong`, `n_skipped` (test questions with no non-null answer) and `score` by the Global Constraints formula, and sets `submitted_at = least(now(), deadline_at + 30s)` (or `now()` for practice).
  - Returns `{score, n_correct, n_wrong, n_skipped}`.
- `get_attempt_review(p_attempt_id uuid) returns jsonb`
  - Only for the owner, and only once submitted.
  - Returns:
    ```
    { attempt:{id,mode,started_at,submitted_at,score,n_correct,n_wrong,n_skipped},
      test:{id,title,kind,marks_correct,marks_wrong},
      questions:[{id,position,topic_name,stem_md,options,selected_key,marked,correct_key,explanation_md,is_correct}] }
    ```
- `create_custom_test(p_topic_ids uuid[], p_count int, p_duration_sec int default null) returns uuid`
  - Requires `p_count between 5 and 50` and at least one topic.
  - Picks `p_count` random questions from those topics (fewer if fewer exist; raises an error if zero).
  - Inserts a test with `kind='custom'`, `created_by=auth.uid()`, `title = 'Custom: ' || string_agg(topic names, ', ')`, `marks_correct=1`, `marks_wrong=0`, `published=true`, `published_at=now()`.
  - Inserts `test_questions` in random order.

- [ ] **Step 1: Write the failing pgTAP tests** `0002_attempts.test.sql`, as user 1, using a test with 3 questions, `marks 2 / -0.66`, `duration 600`:
  - `start_attempt` twice (timed) returns the same id.
  - `get_attempt` JSON for the timed attempt has no `correct_key` anywhere: `ok(get_attempt(id)::text not like '%correct_key%')`.
  - Answer Q1 correct, Q2 wrong, leave Q3 → `submit_attempt` returns `{score: 1.34, n_correct:1, n_wrong:1, n_skipped:1}`. A second `submit_attempt` returns the same.
  - `save_answer` after submit throws.
  - Set `deadline_at = now() - interval '31 seconds'` on a new timed attempt → `save_answer` throws, and `get_attempt` returns `submitted_at` not null.
  - A practice attempt: `save_answer(…, 'B')` returns an object with `correct_key`. A second `save_answer` on the same question throws.
  - `save_answer` with key `'Z'` throws.
  - User 2 calling `get_attempt(user1_attempt)` throws.
  - `get_attempt_review` before submit throws, and after submit includes `explanation_md`.
  - `create_custom_test(array[topic], 5)` with 3 questions available creates a test with 3 `test_questions` and `created_by = user1`.
- [ ] **Step 2:** Run `npm run db:reset && npm run db:test`. Expected: FAIL (functions missing).
- [ ] **Step 3:** Write `0002_attempts.sql` as specified above.
- [ ] **Step 4:** Run `npm run db:reset && npm run db:test` (all pass), then `npm run db:types`.
- [ ] **Step 5:** Commit with the message `feat(db): attempt, scoring, review and custom test functions`.

---

### Task 4: Allowlist auth hook and invite CLI

**Files:**
- Create: `supabase/migrations/0003_allowlist_hook.sql`, `supabase/tests/0003_allowlist.test.sql`, `scripts/invite.ts`, `lib/supabase/admin.ts`
- Modify: `supabase/config.toml`:
  - `[auth.hook.before_user_created] enabled = true, uri = "pg-functions://postgres/public/hook_check_allowlist"`
  - `[auth.email] enable_confirmations = true`
  - `[auth] minimum_password_length = 8`, `site_url = "http://localhost:3000"`, `additional_redirect_urls = ["http://localhost:3000/auth/confirm"]`
- Modify: `package.json` script `invite: tsx --env-file=.env.local scripts/invite.ts`

**Interfaces:**
- `hook_check_allowlist(event jsonb) returns jsonb`
  - Reads `event->'user'->>'email'`.
  - Returns `'{}'::jsonb` if the email is in `allowed_emails`.
  - Otherwise returns `{"error":{"http_code":403,"message":"This email hasn't been invited yet. Ask the person who shared this link to add you."}}`.
  - Execute is granted to `supabase_auth_admin` only and revoked from `public`, `anon` and `authenticated`. `supabase_auth_admin` gets `select` on `allowed_emails`.
- `createAdminClient(): SupabaseClient<Database>` uses `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, has `import 'server-only'` guarded so scripts can import it, and throws a clear error if the env vars are missing.
- `scripts/invite.ts`:
  - `invite <email...>` upserts lower-cased emails and prints `added` or `already invited` for each.
  - `invite --list` prints all emails with their dates.
  - `invite --remove <email>` deletes the email.

- [ ] **Step 1: Write the failing pgTAP test:**
  - `hook_check_allowlist('{"user":{"email":"x@y.com"}}')->'error'->>'http_code' = '403'`
  - After `insert into allowed_emails values ('asha@mail.com')`, `hook_check_allowlist('{"user":{"email":"Asha@Mail.com"}}') = '{}'`
  - As `authenticated`, `select hook_check_allowlist('{}')` throws `42501`.
- [ ] **Step 2:** Run `npm run db:reset && npm run db:test`. Expected: FAIL.
- [ ] **Step 3:** Implement the migration, the config changes, `admin.ts` and `invite.ts`.
- [ ] **Step 4:** Run `npx supabase stop && npm run db:start && npm run db:reset && npm run db:test`. Expected: PASS.
- [ ] **Step 5:** Copy the local keys from `npx supabase status` into `.env.local` and run `npm run invite -- me@test.dev`. Expected: `added me@test.dev`. Run it again; expected: `already invited`.
- [ ] **Step 6:** Commit with the message `feat(auth): invite allowlist hook and invite CLI`.

---

### Task 5: Supabase clients, route protection and auth pages

**Files:**
- Create:
  - `lib/supabase/{server,client,session}.ts`, `proxy.ts` (or `middleware.ts`), `lib/validation.ts`, `lib/auth-errors.ts`
  - `app/(auth)/layout.tsx`, `app/(auth)/{login,signup,forgot-password,reset-password}/page.tsx`, `app/(auth)/actions.ts`, `app/auth/confirm/route.ts`
  - `components/{auth-form,form-field,submit-button,password-rules}.tsx`
  - `supabase/templates/{confirmation,recovery}.html`
- Modify: `supabase/config.toml` (`[auth.email.template.confirmation]` and `recovery` `content_path`)
- Test: `tests/unit/validation.test.ts`, `tests/unit/auth-errors.test.ts`

**Interfaces:**
- `createClient(): Promise<SupabaseClient<Database>>` in `server.ts` (cookies from `next/headers`). `createClient()` in `client.ts` (browser).
- `updateSession(req: NextRequest): Promise<NextResponse>` in `session.ts`:
  - Refreshes the session.
  - Redirects unauthenticated requests to anything except `/login`, `/signup`, `/forgot-password`, `/reset-password` and `/auth/*` to `/login?next=<path>`.
  - Redirects authenticated users away from `/login` and `/signup` to `/study`.
- `passwordRules: {id: 'length'|'letter'|'number'; label: string; test: (p: string) => boolean}[]` with labels `"At least 8 characters"`, `"A letter"`, `"A number"`. `passwordSchema` (zod) is built from them. `emailSchema` is zod email, trimmed and lower-cased.
- `mapSignUpError(e: {status?: number; message: string}): {field: 'email'|'password'|null; message: string}`:
  - status 403, or a message containing `"invited"` → `email` with the exact allowlist copy;
  - a message mentioning `password` → `password`;
  - otherwise `null` with `"Something went wrong. Try again."`
- Server actions return `{ok: true} | {ok: false; field: 'email'|'password'|null; message: string}`:
  - `signIn(formData)` redirects to `next` or `/study`. A wrong email or password gives `null` with `"Email or password is incorrect."`.
  - `signUp(formData)` uses `emailRedirectTo = ${NEXT_PUBLIC_SITE_URL}/auth/confirm`.
  - `requestReset(formData)`, `updatePassword(formData)`, `signOut()`.
- `/auth/confirm`: GET reads `token_hash`, `type` and `next`, calls `verifyOtp`, and redirects to `next` (default `/study`) or to `/login?error=link`.
- The email templates link to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/study` and, for recovery, `type=recovery&next=/reset-password`.

- [ ] **Step 1: Write the failing tests:**
  - `passwordSchema.safeParse('abcdefg1').success === true`
  - `'abcdefgh'` and `'1234567'` fail.
  - `passwordRules.map(r => r.test('a1'))` equals `[false, true, true]`.
  - `mapSignUpError({status: 403, message: 'whatever'})` equals `{field: 'email', message: "This email hasn't been invited yet. Ask the person who shared this link to add you."}`
  - `mapSignUpError({message: 'Password should be at least 8 characters'}).field === 'password'`
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement the libs, the Supabase clients, `proxy.ts` and the actions. Build the auth pages per DESIGN_DIRECTION → Auth:
  - Sign-up says it is invite only and shows `PasswordRules` live under the password field.
  - After sign-up, the card switches to "Check your email" with the address in `Mono` and a "Resend" link (`supabase.auth.resend`).
  - Every field uses `FormField` with an `id`, `autoComplete` and `aria-describedby`.
  - `SubmitButton` uses `useFormStatus` for its busy state.
- [ ] **Step 4:** Run `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 5:** Manual check with `npm run dev`:
  - Signing up with an un-invited email shows the allowlist message under the email field.
  - Signing up with `me@test.dev` lands a confirmation email in local Mailpit (`http://127.0.0.1:54324`); the link signs you in at `/study` (a 404 is fine at this point).
  - Visiting `/tests` while signed out redirects to `/login?next=/tests`.
- [ ] **Step 6:** Commit with the message `feat(auth): email+password auth with invite-only sign-up`.

---

### Task 6: Content loader, push CLI and seed content

**Files:**
- Create: `lib/content/{schema,load,plan,push}.ts`, `scripts/content-push.ts`, all the `content/**` files from File Structure, `tests/fixtures/content-valid/**`, `tests/fixtures/content-invalid/**`
- Modify: `package.json` script `content:push: tsx --env-file=.env.local scripts/content-push.ts`
- Test: `tests/unit/content-load.test.ts`, `tests/unit/content-plan.test.ts`

**Interfaces:**
- File formats. Zod schemas live in `schema.ts` and are `.strict()`.
  - `content/<subject>/subject.yaml`: `{slug, name, description, position: int, published?: bool=true}`
  - `content/<subject>/<topic>/topic.yaml`: `{slug, name, description, position: int}`
  - Lesson `NN-*.md`: frontmatter `{slug, title, position: int, published?: bool=true}` plus a Markdown body.
  - `questions.yaml`: an array of `{slug, stem, options: Record<'A'..'F', string>, answer, explanation, difficulty: 'easy'|'medium'|'hard', source?, tags?: string[]}`
  - `content/tests/<slug>.yaml`: `{slug, title, kind: 'mock'|'pyq', subject, year?: int, duration_min?: number, marks: {correct: number>0, wrong: number<=0}, published?: bool=true, questions: (string | InlineQuestion & {topic: '<subject>/<topic>'})[]}`. `kind: pyq` requires `year`.
- `loadContent(root: string): Promise<ContentBundle>`
  - `ContentBundle = {subjects, topics, lessons, questions, tests}`. Each item has resolved parent slugs (`subjectSlug`, `topicSlug`), and questions have `options: {key, text_md}[]`, `correctKey`, `topicRef`.
  - On any problem it throws `ContentError` with `issues: {file: string; message: string}[]`, collecting every problem rather than stopping at the first.
  - Rules:
    - option keys consecutive from A, 2–6 of them;
    - `answer` is one of the keys;
    - question slugs unique across all files, including inline ones;
    - lesson slugs unique per topic;
    - test slugs unique;
    - every string reference resolves to a question;
    - an inline `topic` resolves;
    - a test's `subject` exists.
- `planChanges<T>(existing: T[], desired: T[], key: (t: T) => string, comparable: (t: T) => unknown): {create: T[]; update: T[]; unchanged: T[]; missing: T[]}` — a pure function that compares with `JSON.stringify(comparable(x))`.
- `pushContent(bundle: ContentBundle, db: SupabaseClient<Database>, opts: {dry: boolean; prune: boolean}): Promise<PushSummary>`
  - `PushSummary = Record<'subjects'|'topics'|'lessons'|'questions'|'tests', {created: number; updated: number; unchanged: number; unpublished: number}>`
  - Order: subjects → topics → lessons → questions → tests → test_questions (replaced per changed test).
  - `published_at` is set to `now()` the first time a lesson or test is pushed as published, and kept afterwards.
  - `--prune` sets `published=false` on subjects, lessons and tests that are missing from the files. Questions are never deleted.
  - `dry` returns the summary without writing.
- The CLI prints a table of the summary. On `ContentError` it prints `file: message` lines and exits 1.

- [ ] **Step 1: Write the failing tests:**
  - `loadContent('tests/fixtures/content-valid')` returns 1 subject, 1 topic, 2 lessons, 3 questions and 1 test; `questions[0].options[1]` equals `{key: 'B', text_md: '…'}`.
  - The invalid fixture (answer `E` with options A–D; a test referencing `nope-001`; a duplicate question slug) throws `ContentError`, and `issues` has exactly 3 entries whose messages contain `answer`, `nope-001` and `duplicate`.
  - `planChanges` with existing `[a1, b1]`, desired `[a1, b2, c1]` returns create `[c]`, update `[b]`, unchanged `[a]`, missing `[]`.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement `schema`, `load`, `plan`, `push` and the CLI.
- [ ] **Step 4: Write the seed content.**
  - GS → Percentages, with lessons "Percentage basics" and "Successive percentage change". Use KaTeX, `> **Example**` callouts and `> **Shortcut**`.
  - 15 questions (5 easy, 6 medium, 4 hard), each with a worked explanation. Verify every answer by computing it.
  - `gs-percentages-mock-1`: kind `mock`, 10 questions, 15 min, marks +2 / −0.66.
  - `sample-pyq-2024`: kind `pyq`, year 2024, title "Sample CSAT-style paper 2024", 5 questions, 10 min, marks +2.5 / −0.83, with `source: "Sample (not an official paper)"`.
- [ ] **Step 5:** Run `npm test` and expect PASS. Run `npm run content:push -- --dry`; expected: the summary shows everything as created. Run `npm run content:push`, then run it again; expected on the second run: every count is `unchanged`.
- [ ] **Step 6:** Commit with the message `feat(content): content loader, push CLI and Percentages seed content`.

---

### Task 7: App shell, shared components, Markdown and formatting

**Files:**
- Create:
  - `lib/format.ts`
  - `components/app-shell/{app-shell,app-mark,bottom-dock,account-menu}.tsx`, `app/(app)/layout.tsx`, `app/page.tsx`
  - `components/{markdown,page-header,stat-tile,progress-bar,data-table,segmented-control,empty-state,loading,section-error,confirm-dialog}.tsx`
  - `components/ui/dialog.tsx` (glass)
- Test: `tests/unit/format.test.ts`, `tests/unit/markdown.test.tsx` (uses `@testing-library/react` and `jsdom`)

**Interfaces:**
- `formatTimer(sec: number): string` (`MM:SS`, or `H:MM:SS` from an hour, clamped at 0), `formatDuration(sec: number): string`, `formatMinutes(sec: number): string`, `formatMarks(n: number): string`, `formatDateTime(d: Date|string): string`, `formatDate(d): string`
- `Markdown({source: string; variant?: 'lesson'|'question'|'option'})`
  - Applies remark-gfm, remark-math and rehype-katex.
  - A blockquote whose first child starts with `<strong>` renders as a `SoftPanel` callout; a `Trap` callout gets the review edge.
  - Display math is wrapped in `overflow-x-auto`.
  - The `option` variant renders inline, with no wrapping `<p>`.
- `ConfirmDialog({open, onOpenChange, tone: 'neutral'|'warning'|'destructive', icon, title, description, cancelLabel?, confirmLabel, pending?, error?, onConfirm})` uses `role="alertdialog"`.
- `BottomDock` items exactly as in DESIGN_DIRECTION (labels Study, Subjects, Tests, Past tests, New; icons House, Library, ClipboardList, History, Sparkles), and sets `aria-current="page"` by route prefix.
- `AccountMenu` shows the user's initials and offers Profile (display name, email) and Sign out (via `ConfirmDialog`).

- [ ] **Step 1: Write the failing tests:**
  - `formatTimer(2527)==='42:07'`; `formatTimer(300)==='05:00'`; `formatTimer(3725)==='1:02:05'`; `formatTimer(-4)==='00:00'`
  - `formatDuration(2527)==='42m 07s'`; `formatDuration(3900)==='1h 05m'`; `formatMinutes(3600)==='60 min'`
  - `formatMarks(-0.66)==='−0.66'` (U+2212); `formatMarks(2)==='+2'`; `formatMarks(0)==='0'`
  - `formatDateTime(new Date(2026,10,23,18,15))==='23 Nov 2026, 18:15'`
  - Markdown: rendering `'$x^2$'` produces an element with class `katex`; rendering `'> **Example**\n> text'` produces a node with `data-callout="example"`.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement everything per DESIGN_DIRECTION (App shell, Modals, Shared components). `app/page.tsx` redirects to `/study`.
- [ ] **Step 4:** Run `npm test && npm run typecheck`, then `npm run dev`. Expected: tests pass, and signed in, the dock shows 5 labelled items and the theme switch works with no flash on reload.
- [ ] **Step 5:** Commit with the message `feat(ui): app shell, bottom dock, markdown and shared components`.

---

### Task 8: Subjects, topics, lesson reader and lesson progress

**Files:**
- Create:
  - `lib/queries/content.ts`
  - `app/(app)/subjects/page.tsx`, `[subject]/page.tsx`, `[subject]/[topic]/page.tsx`, `[subject]/[topic]/[lesson]/page.tsx`, with a `loading.tsx` for each
  - `app/(app)/actions.ts` (initial)

**Interfaces:**
- `listSubjects()` returns `{slug, name, description, topicCount, lessonCount}[]`.
- `getSubject(slug)` returns `{subject, topics: {slug, name, description, lessonCount, doneCount}[]} | null`.
- `getTopic(subjectSlug, topicSlug)` returns `{topic, lessons: {slug, title, position, done}[]} | null`.
- `getLesson(subjectSlug, topicSlug, lessonSlug)` returns `{lesson, prev?, next?, done} | null`. A null result calls `notFound()`.
- Actions:
  - `markLessonDone(lessonId: string, done: boolean): Promise<void>` upserts or deletes `lesson_progress`, then `revalidatePath`.
  - `startTopicPractice(topicId: string): Promise<never>` calls `create_custom_test([topicId], 10, null)`, then `start_attempt(id, 'practice')`, then redirects to `/attempt/<id>`.

- [ ] **Step 1:** Implement the queries, pages and actions per DESIGN_DIRECTION → Subjects. The lesson reader uses `GlowBackdrop still` and a ~70ch column; "Mark as done" toggles to a `correct` badge.
- [ ] **Step 2:** Run `npm run typecheck && npm run build`. Expected: PASS.
- [ ] **Step 3:** Manual check with `npm run dev`: Subjects → General Studies → Percentages → "Percentage basics" renders KaTeX and callouts. Mark as done shows the tick on the topic list and on the subject's progress bar. A bad slug gives a 404.
- [ ] **Step 4:** Commit with the message `feat: subjects, lessons and lesson progress`.

---

### Task 9: Test runner (timed and practice)

**Files:**
- Create:
  - `lib/runner/{palette,timer}.ts`
  - `app/attempt/[id]/page.tsx`, `app/attempt/[id]/actions.ts`
  - `components/runner/{runner,top-bar,question-view,option-card,palette,explanation}.tsx`
- Modify: `app/(app)/actions.ts` (adds `startTest`)
- Test: `tests/unit/palette.test.ts`, `tests/unit/timer.test.ts`

**Interfaces:**
- `type AttemptPayload` mirrors `get_attempt`'s JSON (Task 3); it is exported from `lib/runner/types.ts`.
- `paletteState(q: {visited: boolean; selected: string|null; marked: boolean; result: {is_correct: boolean}|null}): 'unvisited'|'skipped'|'answered'|'marked'|'answered-marked'|'correct'|'wrong'`. `result` takes precedence.
- `timerTone(secondsLeft: number): 'normal'|'review'|'wrong'`: `≤60` → `wrong`, `≤300` → `review`.
- `timerAnnouncement(prevSec: number, nowSec: number): string|null` returns `"5 minutes left"` when crossing 300 and `"1 minute left"` when crossing 60.
- Actions:
  - `saveAnswer(attemptId, questionId, key: string|null, marked: boolean)` returns the `save_answer` JSON.
  - `submitAttempt(attemptId)` redirects to `/past/attempts/<id>`.
  - `startTest(testId: string, mode: 'timed'|'practice'): Promise<never>` redirects to `/attempt/<id>`.
- Page: a server component calls `get_attempt`. If `submitted_at` is set, it redirects to the review.

- [ ] **Step 1: Write the failing tests:**
  - `paletteState({visited: false, selected: null, marked: false, result: null})==='unvisited'`
  - visited and no answer → `'skipped'`; selected `'B'` → `'answered'`; marked with no answer → `'marked'`; selected and marked → `'answered-marked'`; `result {is_correct: false}` → `'wrong'`
  - `timerTone(301)==='normal'`; `timerTone(300)==='review'`; `timerTone(60)==='wrong'`
  - `timerAnnouncement(301,300)==='5 minutes left'`; `timerAnnouncement(299,298)===null`; `timerAnnouncement(61,59)==='1 minute left'`
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement the libs and the runner per DESIGN_DIRECTION → Test runner.
  - **Layout:** top bar, question column, palette (desktop right column; a `Sheet` on phones), legend counts.
  - **Clock:** remaining time = `deadline_at - server_now`, offset by the client clock at load, so skew doesn't matter. At 0 it calls `submitAttempt`.
  - **Answers:** saves are optimistic. On failure the previous state is restored and an inline error shows.
  - **Practice:** "Check" reveals the result and explanation and locks the question.
  - **Shortcuts:** `1–4`/`A–D`, `N`/`P` and `M` are ignored while typing in an input.
  - **Confirmations:** Submit uses `ConfirmDialog` with counts. A "Leave" link asks too, and `beforeunload` is set while an unsubmitted attempt is open.
  - Options are a radio group with `role="radiogroup"`.
- [ ] **Step 4:** Run `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 5:** Manual check with `npm run dev`:
  - Starting the mock timed shows the timer counting down. Refresh keeps the answers and the time.
  - In DevTools, `fetch` the REST `questions?select=correct_key` and get a 401 or 403-style error.
  - With `update attempts set deadline_at = now() + interval '20 seconds'` via SQL, the timer auto-submits into the review URL (the review page arrives in Task 10).
  - A practice attempt reveals the explanation after Check.
- [ ] **Step 6:** Commit with the message `feat: timed and practice test runner`.

---

### Task 10: Attempt review, Tests tab and Past tests tab

**Files:**
- Create: `lib/queries/tests.ts`, `app/(app)/tests/page.tsx`, `app/(app)/past/page.tsx`, `app/(app)/past/attempts/[id]/page.tsx`, `components/review/{review-question,review-filters}.tsx`, and a `loading.tsx` for each

**Interfaces:**
- `listTests(kind: 'mock'|'pyq')` returns `{id, slug, title, year, questionCount, durationSec, marksCorrect, marksWrong, bestScore: number|null}[]`. pyq is ordered by year desc, mock by `published_at` desc.
- `listMyAttempts(page: number, pageSize = 20)` returns `{rows: {id, testTitle, mode, score, accuracy: number|null, durationSec: number|null, submittedAt}[]; hasMore: boolean}`. Accuracy = `n_correct / (n_correct + n_wrong)`.
- The review page calls `get_attempt_review`. The filter is held in a `?filter=all|wrong|skipped|marked` search param.

- [ ] **Step 1:** Implement per DESIGN_DIRECTION → Tests, Past tests and Attempt review.
  - "Start timed" opens a `ConfirmDialog` stating the question count, `formatMinutes(duration)` and the marks, then calls `startTest`.
  - "Practice" starts directly.
  - The review shows a row of stat tiles, filter pills, and questions marked "Your answer" and "Correct answer" with icons and text.
- [ ] **Step 2:** Run `npm run typecheck && npm run build`. Expected: PASS.
- [ ] **Step 3:** Manual check: the submitted mock from Task 9 appears in Past → My attempts with the score matching (+2 per correct, −0.66 per wrong). The review filter "Wrong" shows only wrong questions. Past → Previous-year papers lists "Sample CSAT-style paper 2024".
- [ ] **Step 4:** Commit with the message `feat: tests list, past papers, attempt history and review`.

---

### Task 11: Study home and New tab

**Files:**
- Create: `lib/queries/home.ts`, `app/(app)/study/page.tsx`, `app/(app)/new/page.tsx`, `components/new/test-builder.tsx`, a `loading.tsx` for each
- Modify: `app/(app)/actions.ts` (adds `createCustomTest`, `startQuickPractice`)

**Interfaces:**
- `getContinue()` returns one of:
  - `{type: 'attempt'; attemptId; testTitle; mode}`, for the newest unsubmitted attempt not past its deadline + 30 s;
  - `{type: 'lesson'; href; title; topicName}`, for the first not-done lesson in the topic of the most recently done lesson, else the first lesson overall;
  - `null`.
- `getTopicProgress()` returns `{topicId, name, href, done, total, accuracy: number|null}[]`. Accuracy comes from submitted answers on that topic's questions.
- `getRecentAttempts(limit = 5)` uses the same row type as `listMyAttempts`.
- `getFeed(limit = 20)` returns `{type: 'lesson'|'test'; title; href; where: string; publishedAt; isNew: boolean}[]`. It covers lessons and mock/pyq tests, ordered by `published_at` desc. `isNew` = published within 14 days and the user has no `lesson_progress` (lesson) or attempt (test) on it.
- Actions:
  - `createCustomTest(formData)` takes `topicIds[]`, `count ∈ {10, 20, 30}`, `mode` and `minutes`. Minutes are required when the mode is timed and default to `ceil(count * 1.2)`. It calls `create_custom_test` and `start_attempt`, then redirects.
  - `startQuickPractice()` uses topics with at least one lesson done, or all topics if none.

- [ ] **Step 1:** Implement per DESIGN_DIRECTION → Study and New. The greeting is by local hour: before 12 "Good morning", before 17 "Good afternoon", otherwise "Good evening". Each panel is wrapped in `Suspense` with a `Skeleton`, and an error boundary renders `SectionError` with retry.
- [ ] **Step 2:** Run `npm run typecheck && npm run build`. Expected: PASS.
- [ ] **Step 3:** Manual check:
  - A fresh user sees "Start with Percentages".
  - After reading one lesson, Continue points at the next lesson.
  - A started-but-unfinished timed test shows "Resume test".
  - In the New tab, building a 10-question practice test lands in the runner. The feed shows both lessons and both tests with "New" badges, and the badge disappears once a lesson is marked done.
- [ ] **Step 4:** Commit with the message `feat: study home and new tab with custom test builder`.

---

### Task 12: Polish, README and end-to-end verification

**Files:**
- Create: `README.md` covering:
  - setup;
  - env vars;
  - local Supabase;
  - cloud Supabase steps: enable the Before User Created hook pointing at `public.hook_check_allowlist`, set the Site URL and redirect URLs, and paste the two email templates;
  - the content format, `content:push` and `invite`.
- Modify: anything found in the checks below.

- [ ] **Step 1:** Accessibility and responsive pass at 360px, 768px and 1280px, in light and dark:
  - no horizontal page scroll;
  - focus rings are visible on option cards, palette pills and dock items;
  - `prefers-reduced-motion` stops the glows;
  - every empty state follows DESIGN_DIRECTION wording.
- [ ] **Step 2:** Run `npm test && npm run typecheck && npm run lint && npm run build && npm run db:reset && npm run db:test`. Expected: all pass with zero errors.
- [ ] **Step 3:** Full walkthrough on a fresh database:
  - `db:reset`, `invite`, `content:push`, then sign up, confirm in Mailpit and log in;
  - read a lesson and mark it done;
  - take a timed mock and let it auto-submit, then review it;
  - run a practice attempt;
  - build a custom test;
  - check Past (PYQ list and history);
  - sign out.
- [ ] **Step 4:** Commit with the message `docs: README; polish and verification fixes`.
