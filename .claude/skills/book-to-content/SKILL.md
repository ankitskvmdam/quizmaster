---
name: book-to-content
description: Turn a book PDF (in resources/) into QuizMaster study material — per-chapter gist, key facts and easy/medium/hard MCQs in English, then a translation (Hindi by default). Use when the owner asks to "create content from a book", "process this PDF", or "translate a book's content".
argument-hint: <pdf path> [subject] [exams] [translate-to]
---

# Book PDF → QuizMaster content

Turns one book into chapter gists, key facts and practice questions for exam preparation (BPSC prelims, SSC
CGL/CHSL general awareness), written straight into this repo's content format. It works in two phases: **first
everything in English, then the translation.**

**Run it in its own session.** A whole book is a long job, so don't run it inside a session that is doing other work.
Either open a new Claude Code session in this repo and run `/book-to-content resources/<book>.pdf`, or have the main
session start a background agent whose prompt is "Follow `.claude/skills/book-to-content/SKILL.md` for <pdf>…".

## Inputs (ask only for what you can't infer)

| Input | Default |
|---|---|
| PDF | `resources/<file>.pdf` (`resources/` is git-ignored: books are copyrighted and never committed) |
| Book title, author, edition | read from the title page |
| Course / subject / note group the book covers | `gs` / ask, e.g. `history` / e.g. `modern` |
| Book slug | short kebab-case, e.g. `spectrum-modern-india` |
| Exams | BPSC prelims and SSC CGL/CHSL |
| Questions per chapter | 30: 10 easy, 10 medium, 10 hard (more for long or dense chapters, keeping about a third at each level) |
| Gist length | 300–500 words |
| Translation language | Hindi (`hi`) |

The subject and the note group must already exist (`content/<course>/<subject>/<group>/topic.yaml`). If the group is
missing, create its `topic.yaml` (see `docs/content-format.md`) and say so in the report.

**Read `docs/content-format.md` first.** It is the binding spec for every file you write.

## Phase 1: English

### How to work through the book

Start with the table of contents. List the chapters with their page ranges in the progress file, along with the
offset between PDF page and printed page. Then handle **one chapter at a time**: read the chapter in full, write its
gist and questions, validate them, and only then move to the next chapter.

- Don't write anything for a chapter you haven't actually read in this session.
- Don't fill gaps from general knowledge. The owner revises from your output instead of the book, so anything that
  differs from the book is a mistake they'll carry into the exam.
- Read the PDF with the Read tool's `pages` parameter, at most 20 pages per call.
  - If the text is garbled or the pages are scanned, read the pages as images.
  - If pages are unreadable, record which ones. Never guess their content.
- Always cite the **printed** page number, not the PDF page number.

### The gist

Write a last-day-revision gist of 300–500 words. Prioritise what examiners ask about:
- names, dates, places and numbers;
- definitions, articles and acts;
- causes and consequences;
- firsts and superlatives;
- anything connected to Bihar.

Keep the specific facts: "the chapter discusses several reforms" is useless, but each reform named with its year is
what's needed. After the gist, list the key terms and must-remember facts.

### The questions

The difficulty label matters. The app uses it to measure how deep a candidate's knowledge really goes.

- **Easy:** direct recall of a single fact stated plainly in the chapter, like a typical SSC one-liner.
- **Medium:** needs one of these:
  - two facts combined;
  - a distinction between similar items;
  - plausible distractors drawn from the same chapter;
  - match-the-following or chronological order.
- **Hard:** one of these:
  - multi-statement questions ("Which of the statements given above is/are correct?");
  - assertion-reason;
  - details most readers skim past;
  - options that all look reasonable to someone who read carelessly.

**Tag each question with its best-fit exam,** `ssc` or `bpsc`. SSC questions are short and factual, with four options.
BPSC questions use more statement-based formats and give heavy weight to Bihar: wherever the chapter touches Bihar,
write BPSC questions on it. If web search is available (`ToolSearch "select:WebSearch"`), look once at recent
previous-year papers for each exam and match their option style. If it isn't, say so in the report.

**Every question needs exactly one defensible answer, taken from the chapter itself.**
- Make wrong options believable: real names, dates and terms from the same topic, never absurd ones.
- Spread correct answers evenly across A, B, C and D.
- Never ask about the same fact twice.

**Outdated facts** (a figure, an office holder, a law that has since changed): follow the book, but flag it.

**Before finishing a chapter,** recheck every answer against the book's text. Fix or drop any question whose answer
is ambiguous or unsupported.

### Files (English)

Write only inside `content/<course>/<subject>/books/<book-slug>/`.

- **`book.yaml`:** `title`, `author`, `edition`, `description`, `position`.
- **`NN-<chapter-slug>.md`:** `NN` is the chapter number, two digits. The file has:
  - frontmatter: `slug`, `number`, `title` (as in the book), `covers: [<group>]`;
  - a body with `## Gist`, whose first line is `*Book pages X–Y.*`, followed by the gist;
  - then `## Key facts`, one fact per bullet with the answer-worthy part in **bold**. Flag outdated items as bullets
    starting `⚠ May be outdated:`.
- **`NN-<chapter-slug>.quiz.yaml`:** a list of questions ordered easy → medium → hard. Each question has:
  - `slug`: `<prefix>-NN-e01` / `m01` / `h01`. Pick a short book prefix, e.g. `smi`; slugs must be unique across
    all content;
  - `difficulty`: `easy`, `medium` or `hard`;
  - `stem`, `options` (A–D), `answer`;
  - `explanation`: one or two lines, from the book;
  - `source`: `"<Book short name> (<edition>), p. <printed page>"`;
  - `tags`: `[ssc]` or `[bpsc]`.

  Formatting rules:
  - Multi-statement, assertion-reason and match questions use `stem: |` with Markdown: numbered statements on
    separate lines, and a table or two lists for matching.
  - Leave a blank line after the last numbered statement (before "Which of the statements…") and between the
    Assertion and Reason lines; otherwise Markdown merges them. The dry run rejects a line folded into a list.
  - `---
name: book-to-content
description: Turn a book PDF (in resources/) into QuizMaster study material — per-chapter gist, key facts and easy/medium/hard MCQs in English, then a translation (Hindi by default). Use when the owner asks to "create content from a book", "process this PDF", or "translate a book's content".
argument-hint: <pdf path> [subject] [exams] [translate-to]
---

# Book PDF → QuizMaster content

Turns one book into chapter gists, key facts and practice questions for exam preparation (BPSC prelims, SSC
CGL/CHSL general awareness), written straight into this repo's content format. It works in two phases: **first
everything in English, then the translation.**

**Run it in its own session.** A whole book is a long job, so don't run it inside a session that is doing other work.
Either open a new Claude Code session in this repo and run `/book-to-content resources/<book>.pdf`, or have the main
session start a background agent whose prompt is "Follow `.claude/skills/book-to-content/SKILL.md` for <pdf>…".

## Inputs (ask only for what you can't infer)

| Input | Default |
|---|---|
| PDF | `resources/<file>.pdf` (`resources/` is git-ignored: books are copyrighted and never committed) |
| Book title, author, edition | read from the title page |
| Course / subject / note group the book covers | `gs` / ask, e.g. `history` / e.g. `modern` |
| Book slug | short kebab-case, e.g. `spectrum-modern-india` |
| Exams | BPSC prelims and SSC CGL/CHSL |
| Questions per chapter | 30: 10 easy, 10 medium, 10 hard (more for long or dense chapters, keeping about a third at each level) |
| Gist length | 300–500 words |
| Translation language | Hindi (`hi`) |

The subject and the note group must already exist (`content/<course>/<subject>/<group>/topic.yaml`). If the group is
missing, create its `topic.yaml` (see `docs/content-format.md`) and say so in the report.

**Read `docs/content-format.md` first.** It is the binding spec for every file you write.

## Phase 1: English

### How to work through the book

Start with the table of contents. List the chapters with their page ranges in the progress file, along with the
offset between PDF page and printed page. Then handle **one chapter at a time**: read the chapter in full, write its
gist and questions, validate them, and only then move to the next chapter.

- Don't write anything for a chapter you haven't actually read in this session.
- Don't fill gaps from general knowledge. The owner revises from your output instead of the book, so anything that
  differs from the book is a mistake they'll carry into the exam.
- Read the PDF with the Read tool's `pages` parameter, at most 20 pages per call.
  - If the text is garbled or the pages are scanned, read the pages as images.
  - If pages are unreadable, record which ones. Never guess their content.
- Always cite the **printed** page number, not the PDF page number.

### The gist

Write a last-day-revision gist of 300–500 words. Prioritise what examiners ask about:
- names, dates, places and numbers;
- definitions, articles and acts;
- causes and consequences;
- firsts and superlatives;
- anything connected to Bihar.

Keep the specific facts: "the chapter discusses several reforms" is useless, but each reform named with its year is
what's needed. After the gist, list the key terms and must-remember facts.

### The questions

The difficulty label matters. The app uses it to measure how deep a candidate's knowledge really goes.

- **Easy:** direct recall of a single fact stated plainly in the chapter, like a typical SSC one-liner.
- **Medium:** needs one of these:
  - two facts combined;
  - a distinction between similar items;
  - plausible distractors drawn from the same chapter;
  - match-the-following or chronological order.
- **Hard:** one of these:
  - multi-statement questions ("Which of the statements given above is/are correct?");
  - assertion-reason;
  - details most readers skim past;
  - options that all look reasonable to someone who read carelessly.

**Tag each question with its best-fit exam,** `ssc` or `bpsc`. SSC questions are short and factual, with four options.
BPSC questions use more statement-based formats and give heavy weight to Bihar: wherever the chapter touches Bihar,
write BPSC questions on it. If web search is available (`ToolSearch "select:WebSearch"`), look once at recent
previous-year papers for each exam and match their option style. If it isn't, say so in the report.

**Every question needs exactly one defensible answer, taken from the chapter itself.**
- Make wrong options believable: real names, dates and terms from the same topic, never absurd ones.
- Spread correct answers evenly across A, B, C and D.
- Never ask about the same fact twice.

**Outdated facts** (a figure, an office holder, a law that has since changed): follow the book, but flag it.

**Before finishing a chapter,** recheck every answer against the book's text. Fix or drop any question whose answer
is ambiguous or unsupported.

### Files (English)

Write only inside `content/<course>/<subject>/books/<book-slug>/`.

- **`book.yaml`:** `title`, `author`, `edition`, `description`, `position`.
- **`NN-<chapter-slug>.md`:** `NN` is the chapter number, two digits. The file has:
  - frontmatter: `slug`, `number`, `title` (as in the book), `covers: [<group>]`;
  - a body with `## Gist`, whose first line is `*Book pages X–Y.*`, followed by the gist;
  - then `## Key facts`, one fact per bullet with the answer-worthy part in **bold**. Flag outdated items as bullets
    starting `⚠ May be outdated:`.
- **`NN-<chapter-slug>.quiz.yaml`:** a list of questions ordered easy → medium → hard. Each question has:
  - `slug`: `<prefix>-NN-e01` / `m01` / `h01`. Pick a short book prefix, e.g. `smi`; slugs must be unique across
    all content;
  - `difficulty`: `easy`, `medium` or `hard`;
  - `stem`, `options` (A–D), `answer`;
  - `explanation`: one or two lines, from the book;
  - `source`: `"<Book short name> (<edition>), p. <printed page>"`;
  - `tags`: `[ssc]` or `[bpsc]`.

  Formatting rules:
  - Multi-statement, assertion-reason and match questions use `stem: |` with Markdown: numbered statements on
    separate lines, and a table or two lists for matching.
 starts maths, so write "Rs.".
  - Quote any YAML string containing `:`, `#` or quotes.
  - The app hides `answer` and `explanation` until the learner answers. That serves as the answer key.

**After every chapter, run `npm run content:push -- --dry` and fix everything it reports.** Never push without
`--dry`, and never commit: the owner reviews and pushes.

## Phase 2: Translation (after Phase 1 is complete and validated)

**Start this only when every chapter exists in English and the dry run passes.** The English files are the source of
truth; translate from them, not from the book.

Translations go in a parallel tree inside the content folder, with the same file names as the English:

```
content/translations/<lang>/<course>/<subject>/books/<book-slug>/
```

The push reads it and attaches the text as the Hindi version of each item. `npm run content:push -- --dry` checks
every translated file against its English original. It rejects a translation with no English file, a question slug
that isn't in the matching English file, or any changed answer, option letters, difficulty, source, tags, slug,
number or `covers`. A chapter must still have `## Gist` and `## Key facts` (keep these two headings in English). A
quiz's Hindi title is made automatically from the chapter's Hindi title.

- **Translate only these fields:**
  - in `book.yaml`: `title` and `description`;
  - in chapter files: `title` and the body;
  - in quiz files: `stem`, `options` and `explanation`.
- **Keep everything else byte-identical:**
  - slugs and numbers;
  - `covers`, `answer`, `difficulty`, `source` and `tags`;
  - the `## Gist` / `## Key facts` headings, so files stay machine-readable;
  - option letters and their order. The correct answer must stay under the same letter.
- **Terminology:** use the standard Hindi terms used in BPSC and SSC Hindi-medium papers and in NCERT Hindi. On first
  use, put the English term in brackets after a technical term or the name of an act, e.g.
  स्थायी बंदोबस्त (Permanent Settlement).
- **Names:** keep proper names recognisable.
- **Accuracy:** don't add, drop or soften facts. A translation that changes a date or a name is a wrong answer in the
  exam.
- **Order:** translate chapter by chapter, and record each one in the progress file.

## Progress and report

Keep `.superpowers/sdd/book-<book-slug>/progress.md` (git-ignored). It holds:
- the chapter list with page ranges and the page offset;
- one line per finished chapter: question counts per level, unreadable pages, and slugs you're unsure about;
- one line per translated chapter.

If your context is summarised mid-run, re-read this file and continue from the first unfinished chapter or
translation. Never redo finished work.

At the end, write `.superpowers/sdd/book-<book-slug>/report.md` and return the same short report:
- chapters completed, with counts per level;
- chapters translated;
- unreadable pages;
- questions you weren't sure about, by slug;
- outdated-fact flags;
- whether web search was available;
- the final dry-run result.
