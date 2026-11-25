# QuizMaster content format

This is the spec for writing QuizMaster content: syllabus nodes, notes, questions, books, chapter gists and chapter
quizzes. It is written so a person **or an AI model** (e.g. Claude, run locally) can produce valid files without
reading the code. `npm run content:push -- --dry` checks every rule below and writes nothing.

## Vocabulary

| In the app | In the files | In the database |
|---|---|---|
| Course (General Studies) | `content/<course>/course.yaml` | `subjects` |
| Subject (History) | a top-level folder with `topic.yaml` | `topics` with no parent |
| Note group (Modern → Bihar), listed under **Notes** | a nested folder with `topic.yaml` | `topics` with `parent_id` and `path` |
| Note (lesson) | `NN-<name>.md` in a node folder | `lessons` |
| Practice question | `questions.yaml` in a node folder | `questions.topic_id` |
| Book | `<subject>/books/<book>/book.yaml` | `books` |
| Chapter (gist) | `<subject>/books/<book>/NN-<chapter>.md` | `book_chapters` (+ `chapter_topics` for `covers`) |
| Chapter quiz | `<subject>/books/<book>/NN-<chapter>.quiz.yaml` | `questions.chapter_id` + a `tests` row of kind `chapter` |

## Layout

```
content/
  gs/                                   # a course; folder name = slug
    course.yaml
    history/                            # a subject (top-level node)
      topic.yaml
      ancient/                          # a section; nest as deep as the syllabus needs
        topic.yaml
        india/
          topic.yaml
          01-mauryan-empire.md          # a note
          questions.yaml                # practice MCQs for this node
      books/                            # reserved: the subject's book shelf
        ancient-india-rs-sharma/        # a book; folder name = book slug
          book.yaml
          01-harappan.md                # chapter 1: gist + key facts
          01-harappan.quiz.yaml         # chapter 1 quiz
```

**Reserved folder names:** `books` and `current-affairs` can't be syllabus nodes.

A node's **path** is its folder path under the course, e.g. `history/ancient/india`. Paths are how everything refers to
a node: chapter `covers`, inline test questions, and URLs (`/courses/gs/history/ancient/india`).

## Course and nodes

`course.yaml`:

```yaml
slug: gs
name: General Studies
description: BPSC-level General Studies.
position: 1
```

`topic.yaml` (every node, at any depth; `slug` must equal the folder name):

```yaml
slug: ancient
name: Ancient
description: From prehistory to about 700 CE.
position: 1          # order among its siblings
```

## Notes (lessons)

`NN-<name>.md`, in any node folder. A note's slug can't equal the slug of a child node in the same folder.

```md
---
slug: mauryan-empire
title: The Mauryan Empire
position: 1
---
Short Markdown. Use `##`/`###` headings and `$…$` for maths.

> **Key facts**
> - A blockquote that starts with bold text becomes a callout (`> **Trap**` is shown in amber).
```

## Questions

`questions.yaml` is a list. Practice on a node draws from that node and **everything under it**, plus the quizzes of
chapters that `cover` any of those nodes.

```yaml
- slug: maurya-001             # unique across ALL content (use a prefix per node or chapter)
  difficulty: easy             # easy | medium | hard
  stem: Who founded the Mauryan Empire?
  options: { A: Ashoka, B: Chandragupta Maurya, C: Bindusara, D: Bimbisara }   # A, B, … in order, 2–6
  answer: B
  explanation: Chandragupta Maurya founded it around 321 BCE.   # shown after answering; always write one
  source: Optional, e.g. "BPSC 67th Prelims Q12"
  tags: [optional]
```

**Multi-line stems** (statement, assertion-reason, match questions) use `stem: |`. Leave a **blank line after a
list** and between paragraphs: a line directly under `2. …` is folded into item 2 by Markdown, and the push rejects it.

## Previous-year papers (PYQ)

Papers are grouped by exam and appear under **Tests → <exam>**, year by year, newest first.

```
content/exams/
  bpsc/
    exam.yaml                 # slug, name, description, position, duration_min, marks: { correct, wrong }
    2023/                     # the exam's year (its own label, e.g. BPSC 69th = 2023)
      69th-prelims-set-a.yaml # one paper
  ssc-cgl/ …
  ssc-chsl/ …
```

A paper file:

```yaml
slug: 69th-prelims-set-a        # unique within the exam; the test becomes pyq-bpsc-69th-prelims-set-a
title: BPSC 69th Prelims (Set A)
date: 2023-09-30                # the day it was held
label: Set A                    # or "14 Jul, Shift 1" for SSC
duration_min: 120               # optional: overrides exam.yaml
marks: { correct: 1, wrong: 0 } # optional: overrides exam.yaml (e.g. BPSC before the 67th had no negative marking)
source: bpsc.bih.nic.in (question paper + final answer key)
questions:
  - slug: bpsc-69-a-001         # unique across ALL content: <exam>-<paper>-<number>
    difficulty: medium
    stem: |
      …
    options: { A: …, B: …, C: …, D: …, E: More than one of the above }
    answer: C                   # from the OFFICIAL final answer key
    explanation: …
    topic: gs/history/modern    # optional: tag a syllabus node; the question then also joins that node's practice
```

- A question the official key marks **deleted / cancelled** is left out of the file; note it in `source`.
- Keep questions in the paper's order, numbered in the slug, so a learner can match them to the printed paper.
- Hindi: `content/translations/hi/exams/<exam>/…` mirrors the files, exactly like books (same slugs, answers and numbers).

## Books

`book.yaml`:

```yaml
title: Ancient India
author: R. S. Sharma            # optional
edition: NCERT (old)            # optional
description: One line on what the book covers.
position: 1                     # order on the shelf
published: true                 # optional, default true
```

### Chapters

`NN-<chapter>.md`. `NN` is just for file ordering; `number` is what learners see and must be unique within the book.
The body **must** have these two sections, in this order:

```md
---
slug: harappan-civilisation     # unique within the book
number: 1
title: The Harappan Civilisation
covers: [ancient/india]         # node paths, relative to the subject (history/), that this chapter teaches
---
## Gist
Two to five short paragraphs: what the chapter is about and why it matters, in plain language.

## Key facts
- One fact per bullet, with the answer-worthy part in **bold**.
- At least one bullet. Prefer facts an exam can ask: names, dates, places, firsts, numbers.
```

**Preferred shape: one structured study page.** Instead of `## Gist` + `## Key facts`, the body may be one merged
page with three or more `##` sections (an at-a-glance table, the main sections with the same sub-headings in each,
comparison tables, numbered reasons) ending in a "Remember" callout:

```md
> **Remember**
>
> - **May 1498:** Vasco da Gama reached Calicut.
```

How to write it, in English and Hindi, is in `.claude/skills/study-content-writing/SKILL.md`; its `check-page.mjs`
checks a page. New pages should use this shape. The loader accepts both.

`covers` links the book to the syllabus. Every path must exist under the same subject. A chapter can cover several
nodes; tag the most specific nodes it really teaches.

### Chapter quiz

`NN-<chapter>.quiz.yaml`, next to the chapter, with the same file prefix. It is a list of questions in exactly the
format above (aim for 5–10). It becomes a practice-only test (marks +1 / 0) with explanations shown as you go, and its
questions also join practice for every node the chapter covers.

### Whole-book quiz

`quiz.yaml`, next to `book.yaml`, is optional: `questions: [<slug>, …]` lists question slugs from this book's own
chapter quizzes, in order. It becomes one fixed practice quiz over the whole book. It has no translation file; its
questions and title follow the book's.

### Topics

A topic is material written for one syllabus topic (e.g. Freedom Struggle) instead of a published book. It is stored
exactly like a book, in `books/<slug>/`, with `kind: topic` in `book.yaml` (both languages). The app shows it on the
subject's **Topics** shelf and calls its chapters "sections". `author` and `edition` are left out.

## Rules for AI-written content

- Write only facts you can support from the source the owner gives you; put the source in `source` when it is a past
  paper.
- Each quiz question should be answerable from the chapter's **Key facts**. Each key fact should be specific enough to
  ask about.
- Distractors must be plausible and from the same category (four dynasties, four years), never jokes.
- One correct option only; explanations say why it is right in one or two sentences.
- Keep slugs stable once pushed: they are how updates find existing rows, and attempts refer to questions.
- Run `npm run content:push -- --dry` and fix every reported problem before pushing.

## Reading the data back (for later AI use)

Everything above is structured so a later export can hand a model, per learner: the syllabus tree (`topics.path`),
each chapter's gist and key facts with its `covers` tags, and the learner's per-question results (`attempt_answers` →
`questions.topic_id` / `questions.chapter_id`). That export is not built yet.

## Making content from a book PDF

The `/book-to-content` Claude Code skill (`.claude/skills/book-to-content/SKILL.md`) turns a book PDF in `resources/`
into chapters and quizzes in this format: English first, then a translation (Hindi by default) under
`content/translations/<lang>/…`, mirroring the English files. The push reads Hindi (`hi`) translations and checks
them against the English (answers, option letters, difficulty and slugs must match). Run the skill in its own
session; a whole book is a long job.
