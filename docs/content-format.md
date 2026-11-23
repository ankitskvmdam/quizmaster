# QuizMaster content format

This is the spec for writing QuizMaster content: syllabus nodes, notes, questions, books, chapter gists and chapter
quizzes. It is written so a person **or an AI model** (e.g. Claude, run locally) can produce valid files without
reading the code. `npm run content:push -- --dry` checks every rule below and writes nothing.

## Vocabulary

| In the app | In the files | In the database |
|---|---|---|
| Course (General Studies) | `content/<course>/course.yaml` | `subjects` |
| Subject (History) | a top-level folder with `topic.yaml` | `topics` with no parent |
| Section / topic (Ancient → India) | a nested folder with `topic.yaml` | `topics` with `parent_id` and `path` |
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

`covers` links the book to the syllabus. Every path must exist under the same subject. A chapter can cover several
nodes; tag the most specific nodes it really teaches.

### Chapter quiz

`NN-<chapter>.quiz.yaml`, next to the chapter, with the same file prefix. It is a list of questions in exactly the
format above (aim for 5–10). It becomes a practice-only test (marks +1 / 0) with explanations shown as you go, and its
questions also join practice for every node the chapter covers.

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
