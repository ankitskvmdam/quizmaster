# Design direction — QuizMaster

Status: **draft, before any pages are built**. Date: 2026-11-23.

QuizMaster is a private web app for learning and practising General Studies maths and reasoning (quantitative
aptitude, CSAT / SSC style). People get in by invitation, read short lessons, and take tests in timed or practice mode.
The name and tagline live in one place, `lib/brand.ts`.

The look is **calm and clean**: a flat light grey canvas, white panels with hairline borders, a deep teal primary and
mint tints. It works the same in light and dark.

The premise: **a quiet room to think in**. On every screen the question and its numbers are the loudest thing.
Nothing moves, blinks or competes with a person who is working out a percentage in their head.

## Scope

Everything in the Next.js app: the auth pages and every page behind sign-in. Content (lessons, questions) is written in
Markdown and rendered by one shared component, so it follows this document too.

## How it is built

**Tailwind CSS v4 + shadcn/ui.** No second styling system.

1. **Tokens** — `app/globals.css` defines every colour, font, radius and shadow as a CSS variable: light on `:root`,
   dark on `:root[data-theme='dark']`. This is the one place a palette change is made.
2. **Tailwind theme** — an `@theme inline` block in the same file maps the tokens to Tailwind names (`bg-panel`,
   `text-muted-foreground`, `border-hairline`, `rounded-panel`, …), so utilities read the variables.
3. **shadcn/ui** — its own variables (`--background`, `--card`, `--primary`, `--border`, `--ring`, `--radius`, …) are
   aliases of our tokens, so every shadcn component follows the palette and dark mode with no change of its own.
   Components are copied into `components/ui/` and restyled there once (pill buttons, glass dialogs); pages never
   restyle them.

Rules that follow from this:

- Use token utilities or `var(--token)`. Do not write hex colours, `bg-white`, `text-black`, Tailwind's raw palette
  (`bg-teal-600`) or `rgba(…)` shadows in a component; a hard-coded colour breaks dark mode.
- New tokens go in `globals.css` with both a light and a dark value, and get a Tailwind name in `@theme inline`.
- Do not set a button's radius, background or border with `className`. Pick a variant; set only size and layout.

## Themes

The preference is **System** (default), **Light** or **Dark**, chosen from the `ThemeSwitcher` (monitor / sun / moon)
in the header and on the auth pages. It is saved in `localStorage` (`gs.theme`); System follows the OS setting live. An
inline script in `<head>` sets `data-theme` on `<html>` before first paint, so a dark-mode user never sees a light flash.

| | Light | Dark |
|---|---|---|
| Canvas (`--canvas`) | `#f5f7f7`, flat light grey | `#0f1514`, near-black teal |
| Glows (`--glow-1..4`) | very faint mint | barely-there teal-black tints |
| Panels (`--panel-bg`, `--panel-border`, `--panel-shadow`) | `#ffffff`, `#e3e8e7` hairline, soft shadow | `#151e1d`, white at 8% hairline, no shadow |
| Soft panel (`--soft-bg`) | `#f0f4f3` | white at 4% |
| Text (`--foreground`) | `#1b2423` | `#e8efee` |
| Muted text (`--muted-foreground`) | `#5f6b69` | `#93a3a0` |
| Primary (`--primary`, `--primary-foreground`) | teal `#2f7d72`, white text | light teal `#4fb3a4`, `#0f1514` text |
| Accent tint (`--tint`, `--tint-foreground`) | mint `#e3f2ee`, `#22594f` | teal at 14%, `#9fdcd2` |
| Gradient (`--grad-1..3`) | teal to light teal | light teal to pale teal |
| Focus ring (`--ring`) | primary at 45% | primary at 55% |
| Input (`--input-bg`, `--input-border`) | white, `#d5dddb` | white at 4%, white at 12% |

**Answer states** have their own tokens, because they carry most of the meaning in this app. Each has a fill, a
border and a text colour (`--correct-bg/-border/-fg`, and the same for the others):

| State | Means | Light | Dark |
|---|---|---|---|
| `correct` | right answer, done | green tint, dark green text | translucent green, light green text |
| `wrong` | wrong answer, failure | red tint, dark red text | translucent red, light red text |
| `review` | marked for review, needs attention, time running low | amber tint, dark amber text | translucent amber, light amber text |
| `skipped` | not answered | neutral (soft panel, muted text) | same |

Text on its background meets WCAG AA in both themes for every pair above. Check any new pair before adding it.

## Typography

- **Hanken Grotesk** (variable, `next/font`) — headings and body, `font-sans`.
- **JetBrains Mono** (variable) — **every figure**: scores, the timer, question numbers, percentages, counts, dates,
  durations, marks. Always with `tabular-nums` (the `Mono` component does both). Also small uppercase eyebrows
  (`Eyebrow`) and the app mark.
- **Maths** is KaTeX, rendered from `$…$` and `$$…$$` in Markdown. Inline maths sits at the body size; display maths
  is centred and scrolls sideways on its own if it is wider than the column, never the page.
- Sizes: page title 28px / semibold; panel title 18px / semibold; body 16px / 1.6; question stem 18px / 1.6 (a
  question is read carefully, so it is bigger than body); table cells 14px; eyebrows 11px uppercase mono, tracked.

## Radius and buttons

`--radius` (10px) for inputs, tiles and option cards; `--radius-panel` (24px) for panels; `--radius-card` (32px) for the
auth card and modals; `--radius-dock` (28px) for the dock, with 16px items. Header icon buttons, pills and badges are
fully round.

**Buttons are pills**, everywhere.

- **Primary**: solid `--primary` fill, `--primary-foreground` text. One per view: the thing we want the person to do.
- **Secondary**: glass. The panel colour at 62% with a hairline; solid panel on hover.
- **Ghost**: text only, for low-weight actions in rows and headers.
- **Destructive**: only inside a `ConfirmDialog`.
- Heights: 40px by default and in page headers; 48px for a page's main action on a phone (Start test, Submit).

## Backdrop

`GlowBackdrop` sits behind every page: the canvas colour plus four large, heavily blurred circles in the `--glow-*`
colours, drifting on 19–26 s loops. It is fixed to the viewport, decorative and `aria-hidden`.

- On the **test runner** and the **lesson reader** it is held still (`<GlowBackdrop still />`). Nothing moves while
  someone is thinking.
- All motion stops under `prefers-reduced-motion`.
- Dark mode glows are barely visible. Bright glows fight white text.

## App shell

`AppShell` (`components/app-shell/`), rendered by `app/(app)/layout.tsx`:

1. **Header** (not fixed), centred at `72rem`: the app mark on the left (gradient dot, mono "QuizMaster"; the name
   hides on narrow phones). On the right, round `IconButton`s: `ThemeSwitcher` and `AccountMenu` (initials; profile,
   sign out).
2. **Content** — centred at `72rem` with 16px side padding on phones and 24px above, and bottom padding that keeps the
   last content clear of the dock.
3. **`BottomDock`** — the primary navigation: a floating glass dock fixed at the bottom centre, the same on desktop and
   phone. The current page is filled with the primary colour and marked `aria-current="page"`.

| Item | Route | Icon (lucide) |
|---|---|---|
| Study | `/study` | `House` |
| Subjects | `/subjects` | `Library` |
| Tests | `/tests` | `ClipboardList` |
| Past tests | `/past` | `History` |
| New | `/new` | `Sparkles` |

Each item shows its icon with a small label under it, at every width (five items fit on a 360px phone). Labels are
shown, not tooltips, because the people using this are learners, not daily power users.

**The test runner has no dock and no header.** It is a focused screen with its own top bar (see Test runner). Leaving it
mid-test asks first.

## Pages

### Auth (`app/(auth)/`)

Sign in, sign up, forgot password and reset password share one layout: the glow backdrop; `ThemeSwitcher` top right;
the app mark and a tagline ("Maths and reasoning for General Studies, one question at a time.") above an `AuthCard`
(32px radius panel, max 26rem wide).

- Forms are built from `components/auth-form.tsx`: `AuthHeading` (title + one line), fields, `SubmitButton`,
  `AuthLink` for the secondary link ("Forgot password?", "Back to sign in").
- Sign up says plainly that it is **invite only**. An email not on the list gets an error on the email field: "This
  email hasn't been invited yet. Ask the person who shared this link to add you." Not a generic failure.
- Where a password is chosen, `PasswordRules` lists the rules under the field and ticks each as it is met.
- After sign up: a "Check your email" state in the same card, with the address in mono and a resend link.

### Study (home, `/study`)

A centred greeting by time of day ("Good evening, " and the person's display name, or the first part of their email) with the date in mono above it. Then:

- **Continue** — first and widest, tinted panel: the lesson or unfinished practice the person left off, with one
  primary button ("Continue lesson" / "Resume test"). A new account sees "Start with Percentages" instead.
- **Your progress** — one row per topic: name, a thin progress bar (lessons done / total), and accuracy so far in mono.
- **Recent attempts** — the five newest, each linking to its review: test name, mode badge, score, date.
- **Quick practice** — one secondary button that starts a 10-question practice set from topics the person has read.

Each panel loads and fails on its own: `Skeleton` while loading, `SectionError` with a retry if it fails. Every number
is real; no decorative stats.

### Subjects (`/subjects` → subject → topic → lesson)

- **Subjects**: a grid of cards (icon tile, name, one-line description, "N topics · M lessons" in mono). Only GS for
  now; the grid is there so more slot in.
- **Subject**: `PageHeader`, then topic cards in order, each with its progress bar.
- **Topic**: the lessons as a numbered list (number in mono, title, a tick when done), and a "Practice this topic"
  pill that starts an untimed practice set.
- **Lesson reader**: one readable column (~70ch), centred. Eyebrow (subject · topic), title, then the rendered
  Markdown. At the end: "Mark as done" (primary until done, then a `correct` badge) and previous / next lesson.

### Tests (`/tests`)

A `PageHeader`, then one panel with a dense table of mock tests: title, questions (mono), duration (mono, "60 min"),
marking ("+2 / −0.66" in mono), your best score if any, and two actions: **Start timed** (primary) and **Practice**
(secondary). Starting a timed test opens a `ConfirmDialog` that states the time, the number of questions and the
marking, so nobody starts a clock by accident.

### Past tests (`/past`)

Two sections on one page:

- **Previous-year papers** — the same table as Tests, with the year and exam in the title column ("CSAT 2023"). Newest
  year first.
- **My attempts** — every attempt: test, mode badge (Timed / Practice), score, accuracy %, time taken, date, and a
  chevron. The whole row opens the review. Sorted newest first; paged 20 at a time.

### Attempt review (`/past/attempts/[id]`)

- Header: test title, mode badge, date.
- A row of **stat tiles**: score (largest), correct, wrong, skipped, accuracy, time taken. All mono.
- Filter pills: All · Wrong · Skipped · Marked.
- Each question in a panel: number and topic eyebrow, the stem, the options with **your answer** and **the correct
  answer** marked (by icon and text label, not only colour), then the explanation in a `SoftPanel`.

### New (`/new`)

- **Build a test** — a panel at the top: pick topics (checkbox chips), number of questions (`SegmentedControl`: 10 ·
  20 · 30), mode (Timed / Practice), and for timed, minutes (defaults to 1.2 min per question, editable). One primary
  "Create test".
- **What's new** — a feed of recently published lessons and tests, newest first: an icon tile for the type, the title,
  where it lives (subject · topic), and the date in mono. Items the person hasn't opened carry a small "New" badge.

## Test runner (`/attempt/[id]`)

The most important screen in the app. Full width, no dock, no header, still backdrop.

**Top bar** (sticky): test title on the left; on the right the **timer** (timed mode) and **Submit** (secondary;
primary on the last question).

- The timer counts down from the server's `deadline_at` in mono (`42:07`). It turns `review` amber at 5 minutes and
  `wrong` red at 1 minute. A screen reader hears it only at 5 minutes and 1 minute (`aria-live="polite"`), never every
  second. At zero the test submits itself and opens the review.
- In practice mode the timer is replaced by an elapsed time in muted mono, so there is no pressure.

**Question area** (left, ~70ch):

- Eyebrow: "Question 7 of 25 · Percentages", the number in mono.
- The stem at 18px, with KaTeX.
- **Options as cards**: full-width, 10px radius, a letter tile (A–D, mono) on the left, the option text on the right.
  Selected: primary border and mint tint. The whole card is the target (min 56px tall), and the group is a radio group
  (arrow keys move, Space selects).
- Below: **Mark for review** (ghost, toggles a `review` badge), **Clear**, and **Previous / Next** (Next is primary).
- **Practice mode**: after choosing, a "Check" button. Then the correct option turns `correct` with a check icon, a
  wrong choice turns `wrong` with a cross icon, both labelled in text ("Your answer", "Correct answer"), and the
  explanation opens in a `SoftPanel` under the options. The choice is then locked.

**Question palette** (right column on desktop; a bottom sheet behind a "Questions" button on phones): numbered round
pills in a grid.

| Pill | Look |
|---|---|
| Not visited | hairline outline, muted number |
| Visited, not answered | `skipped` fill |
| Answered | primary fill |
| Marked for review | `review` fill |
| Answered and marked | `review` fill with a small primary dot |
| Current | ring in `--ring` around whichever of the above |
| Practice: checked | `correct` or `wrong` fill |

Under the grid, a legend with the counts in mono ("Answered 12 · Marked 3 · Not answered 10").

**Keyboard**: `1–4` or `A–D` choose an option, `N` / `P` next and previous, `M` mark for review. Shown once in a small
"Shortcuts" popover; never required.

**Submitting**: `ConfirmDialog`: "Submit Percentages mock 1?" with one sentence giving the counts ("You've answered 22
of 25; 3 are unanswered. You can't change answers after submitting."). Leaving the page mid-test (back, dock link,
closing the tab) asks too; the attempt keeps running on the server and can be resumed from Study until its time is up.

## Content rendering

`components/markdown.tsx` renders lessons, question stems, options and explanations: `react-markdown` with
`remark-gfm`, `remark-math` and `rehype-katex`. Conventions for content authors:

- `##` and `###` headings only inside lessons (the page owns `#`).
- A blockquote whose first line is bold is a callout in a `SoftPanel`: `> **Example**`, `> **Shortcut**`, `> **Trap**`
  (the last gets the `review` amber edge).
- Tables render as the dense table style, scrolling sideways on phones.
- Images take the column width, with a 10px radius, and need alt text.
- Numbers in prose stay in the body font; only UI figures are mono.

## Shared components

In `components/ui/` (shadcn, restyled once) and `components/`:

- `surfaces.tsx` — `Panel` (the standard container), `SoftPanel` (nested block), `IconTile`, `Mono`, `Eyebrow`,
  `AccentText`.
- `badge.tsx` — pill with an optional dot; variants follow the state tokens.
- `icon-button.tsx` — the round header button.
- `page-header.tsx` — title, one line of description, actions on the right.
- `stat-tile.tsx` — a label (eyebrow) over a big mono figure.
- `progress-bar.tsx` — thin bar in the primary colour on a soft track, with an accessible label.
- `data-table.tsx` — the dense borderless table: 14px cells, uppercase mono eyebrow headers, mono right-aligned
  numbers, hairline row dividers. A row that opens something tints on hover and keeps a real link inside it.
- `segmented-control.tsx` — a radio group drawn as pills (theme, question count, mode).
- `empty-state.tsx`, `loading.tsx` (`Spinner`, `Skeleton`), `section-error.tsx` (message + retry).
- `confirm-dialog.tsx`, `dialog.tsx` — see Modals.
- `submit-button.tsx` — a form's main action with the busy state.
- `form-field.tsx` — label above, control, hint or error under, wired with `aria-describedby`.

## Patterns

- **Loading**: a button waiting on the server is disabled, `aria-busy`, and shows `Spinner` before its label; the
  label stays so the width does not jump. Pages stream with `loading.tsx` skeletons shaped like the content.
- **Status and meaning**: colour never carries meaning alone. Correct / wrong / marked always come with an icon or a
  word.
- **Focus**: a visible ring (`--ring`, box-shadow) on every interactive element, including option cards and palette
  pills.
- **Numbers**: `Mono` wherever figures appear. Dates as "23 Nov 2026, 18:15"; durations as "1h 05m" or "42:07" on the
  timer; marks with a real minus sign ("−0.66").
- **Forms**: label above, error under its field; a server error that belongs to a field shows on it, any other above
  the fields. Enter submits.
- **Empty states**: say what will appear here and give the one action that fills it ("No attempts yet. Take your first
  test.").
- **Motion**: slow and decorative only, never on the runner or the reader. Respect `prefers-reduced-motion`.

## Modals

One surface, two layouts.

**The surface: frosted glass.** A dimmed, slightly blurred page behind (`--overlay`); one 32px rounded surface of the
panel colour at 62% with `backdrop-filter: blur(22px) saturate(150%)`; a faint accent glow in the top-left
(`--grad-3` at 22%) and bottom-right (`--grad-1` at 16%) corners as background layers; a hairline border and
`--modal-shadow`. 32px padding (24px on phones). Pill buttons. **No header bar and no separator lines.** The glass is
defined once, in `components/ui/dialog.tsx`; do not give a modal its own background.

**`ConfirmDialog`** — for every confirmation (start timed test, submit, leave test, sign out). A 48px tinted icon tile
top left (mint for neutral, amber for a warning, red for destructive); a title that names the thing as a question
("Submit Percentages mock 1?"); one plain sentence on what happens and whether it can be undone; Cancel then the
confirm button, bottom right, the confirm label saying what it does ("Submit test", not "OK"). While it runs both are
disabled and the confirm button shows a spinner. It is an `alertdialog`.

**`Dialog`** — for modals with content (keyboard shortcuts, profile). Title top left, a round close button top right,
content, actions bottom right.

## Deliberately avoided

- A left sidebar. It costs width the question needs and becomes a drawer on phones; the dock does neither.
- Gamification noise: confetti, streak flames, sounds, animated counters. Progress is shown plainly.
- Showing whether an answer is right during a timed test. Only practice mode reveals answers before submitting.
- Bright, saturated glows in dark mode.
- A second styling system or ad-hoc colours.

## Where it lives in code

- Tokens, Tailwind theme mapping, keyframes: `app/globals.css`
- Fonts: `app/layout.tsx` (`next/font/google`: Hanken Grotesk, JetBrains Mono); KaTeX CSS imported there too
- Theme preference and head script: `lib/theme.ts`, `components/theme-switcher.tsx`
- App shell: `components/app-shell/{app-shell,app-mark,bottom-dock,account-menu}.tsx`
- Auth layout and form pieces: `app/(auth)/layout.tsx`, `components/auth-form.tsx`
- Test runner: `app/(app)/attempt/[id]/` and `components/runner/`
- Markdown renderer: `components/markdown.tsx`
- Shared components: `components/ui/`, `components/`
- Brand name and tagline: `lib/brand.ts`
