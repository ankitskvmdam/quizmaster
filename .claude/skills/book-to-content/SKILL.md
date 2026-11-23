---
name: book-to-content
description: One command turns a book PDF in resources/ into finished QuizMaster content — per-chapter gist, key facts and easy/medium/hard MCQs in English, then a checked Hindi translation, validated and loaded into the LOCAL database on a new git branch. Use when the owner says "create content from a book", "process this PDF", "/book-to-content <pdf>", or asks to translate a book's content.
argument-hint: <pdf path> [subject/group, e.g. history/modern] [book-slug]
---

# Book PDF → QuizMaster content (one command)

`/book-to-content resources/<book>.pdf` runs the whole pipeline without stopping:

1. **Set up:** work out the book, the subject, the slugs and the chapter list.
2. **English:** a gist, key facts and leveled questions for every chapter, from the book only.
3. **Hindi:** translate the English files, checked against them field by field and number by number.
4. **Finish:** final checks, load into the **local** database, commit on a new branch, and report.

It never touches production and never pushes git. The owner reviews locally, then asks for production separately.

**Work like an orchestrator.** You (the session that got the command) plan, brief, check and report. Parallel
sub-agents do the chapter work in batches (Agent tool, `general-purpose`), so a 40-chapter book finishes in about an
hour instead of many. If you have no Agent tool, do the batches yourself, one after another, in the same way.

**Don't stop to ask.** Decide anything the book leaves open, write it in the report, and carry on. Stop only if the PDF
can't be read at all.

The binding file format is `docs/content-format.md`. Read it first.

## Step 0: Set up

| Decide | How |
|---|---|
| Book title, author, editor, edition | from the title page and the imprint page |
| Subject and note group (`covers`) | from the argument, else from the book's subject: e.g. modern Indian history → `history/modern`. If the group folder is missing, create its `topic.yaml` |
| Book slug | the argument, else short kebab-case from publisher and title (e.g. `spectrum-modern-india`) |
| Question slug prefix | 2–4 letters (e.g. `smi`). Make sure no existing question slug starts with it: `grep -r "slug: <prefix>-" content` |
| Exams | BPSC prelims and SSC CGL/CHSL general awareness |
| Language | English first, then Hindi (`hi`) |

**Workspace:** `.superpowers/sdd/book-<book-slug>/` (git-ignored). It holds `progress.md`, the briefs, the extracted
text and the report. If `progress.md` already exists, **resume**: never redo a chapter it marks done.

**Read the PDF as text.** The Read tool may fail on PDFs (no `pdftoppm`). Use `pdftotext`, which works in Git Bash:

- **Find the page offset:** extract the contents pages, e.g.
  `pdftotext -layout -enc UTF-8 -f 1 -l 40 "<pdf>" ".superpowers/sdd/book-<slug>/front.txt"`, then read that file with
  the Read tool. Compare the printed page numbers with the PDF page numbers (Spectrum: PDF = printed + 32).
- **Extract every chapter to its own file:**
  `pdftotext -layout -enc UTF-8 -f <first PDF page> -l <last> "<pdf>" ".superpowers/sdd/book-<slug>/text/NN.txt"`.
- **Read text files whole, with the Read tool.** Never pipe them through `grep`, `sed` or `awk` filters: the first
  Spectrum run silently lost every line containing ₹, £, an em dash or an accented letter that way.
- **Scanned pages** (empty text): read those pages as images. If a page can't be read either way, record it and
  never guess its content.

Write `progress.md` with the chapter list (number, title, printed pages, PDF pages), the offset and the slugs, plus
`book.yaml` in `content/<course>/<subject>/books/<book-slug>/`. Skip appendices that are only reference tables, and
say so in the report.

## Step 1: English

Copy the **English brief** below into `.superpowers/sdd/book-<slug>/brief-en.md`, with the paths, slugs and prefix
filled in. Then start parallel sub-agents, each with a disjoint batch of chapters: about 3–4 chapters each, at most
about 10 agents, with long chapters alone. Each prompt is: "Follow `<brief-en.md>` for chapters <list>. Return the
per-chapter summary it asks for."

Write chapter 1 yourself first, or have the first agent do it and check it before starting the rest. The other agents
then use it as the model for depth and style.

When all agents are done:
- run `npm run content:push -- --dry` and fix what it reports;
- spot-check about 10 hard questions against the extracted text;
- check that correct answers are spread evenly over the letters and that the difficulty split is close to a third each.

### English brief (template)

> You turn chapters of a book into QuizMaster content for BPSC prelims and SSC CGL/CHSL candidates. The book:
> <title>, <author>, <edition>. Its text is extracted per chapter in `.superpowers/sdd/book-<slug>/text/NN.txt`
> (printed page = PDF page − <offset>). Write to `content/<course>/<subject>/books/<book-slug>/`. The format spec is
> `docs/content-format.md`; chapter 1 (`01-*.md` and `01-*.quiz.yaml`) is the model for depth and style. Touch only
> your chapters' files and your notes file `.superpowers/sdd/book-<slug>/notes-en-<batch>.md`. Never run git; never
> run `content:push` without `--dry`. Ignore dry-run issues about other agents' chapters.
>
> **Accuracy.** Read the whole chapter text before writing anything. Use only the book: no general knowledge, no
> filling gaps. The owner revises from your output instead of the book, so anything that differs from the book is a
> mistake they'll carry into the exam. Where the book contradicts itself, use the main text and add a key-fact bullet
> "Book inconsistency: … — verify". Where a fact has since changed (a law, an office holder, a figure), follow the
> book and add a bullet "⚠ May be outdated: …".
>
> **Gist** (`NN-<chapter-slug>.md`, 300–500 words; up to about 1,100 for very long chapters, in parts).
> - Frontmatter: `slug`, `number`, `title` (as in the book), `covers: [<group>]`.
> - `## Gist`, starting with `*Book pages X–Y.*` (printed pages), then a last-day-revision summary that keeps the
>   specific facts: names, dates, places, numbers, definitions, articles and acts, causes and consequences, firsts
>   and superlatives, and anything about Bihar. "The chapter discusses several reforms" is useless; each reform named
>   with its year is what's needed.
> - `## Key facts`: one must-remember fact or key term per bullet, with the answer-worthy part in **bold**.
>
> **Questions** (`NN-<chapter-slug>.quiz.yaml`): 30 per chapter, 10 easy, 10 medium and 10 hard. Write more for long
> or dense chapters (about a third at each level) so every major section is covered, and fewer only for very short
> chapters, without repeating a fact.
> - **Easy:** one fact stated plainly; the SSC one-liner.
> - **Medium:** two facts combined, a distinction between similar items, distractors from the same chapter, or match
>   and chronological-order questions.
> - **Hard:** multi-statement ("Which of the statements given above is/are correct?"), assertion-reason, details most
>   readers skim, or options that all look right to a careless reader.
>
> **Exam tags and formats.** Tag each question `tags: [ssc]` or `tags: [bpsc]`. SSC questions are short and factual,
> with four options A–D. BPSC questions follow the current (67th–71st) paper format: five options, where E is "More
> than one of the above" for single-fact questions or "None of the above" for statement, match and order questions;
> assertion-reason keeps the usual four. Wherever the chapter touches Bihar, write BPSC questions on it.
>
> **Answers.** Exactly one defensible answer, taken from the chapter. Plausible distractors: real names, dates and
> terms from the same topic. Spread the correct answers evenly over the letters.
>
> **Fields:**
> - `slug`: `<prefix>-NN-e01`, `-m01`, `-h01`, …
> - `difficulty`;
> - `stem`;
> - `options: { A: "…", B: "…" }`;
> - `answer`;
> - `explanation`: one or two lines, from the book;
> - `source: "<short book name> (<edition>), p. <printed page>"`;
> - `tags`.
>
> **YAML and Markdown.** Quote strings that contain `:`, `#` or quotes. Statement, assertion-reason and match questions
> use `stem: |` with:
> - numbered statements on separate lines;
> - **a blank line after the last statement** and between the Assertion and Reason lines (otherwise Markdown merges
>   them, and the dry run rejects it);
> - a Markdown table for match lists.
>
> `$` starts maths, so write "Rs.".
>
> **Per chapter:** recheck every answer against the text, fix or drop any ambiguous question, run
> `npm run content:push -- --dry` and fix your issues. Then append to your notes file:
> `Ch NN — done — E/M/H counts — unreadable pages — unsure slugs — outdated flags`.
> Return those lines.

## Step 2: Hindi

Start only after Step 1 passes the dry run. The English files are the source of truth: translate from them, never from
the PDF, and never change an English file.

Copy the **Hindi brief** below into `.superpowers/sdd/book-<slug>/brief-hi.md` and start parallel sub-agents on
disjoint chapter batches, as in Step 1. Each reads `.claude/skills/book-to-content/hindi-glossary.md`. If the book
brings new recurring terms, add them to that glossary at the end, so the next book uses the same Hindi.

When all agents are done, run these. Both must pass. The checker may flag only options that are pure acronyms or
codes.
- `node .claude/skills/book-to-content/check-translation.cjs content/<course>/<subject>/books/<book-slug>`
- `npm run content:push -- --dry`

### Hindi brief (template)

> You translate chapters of a QuizMaster book into Hindi for BPSC and SSC Hindi-medium candidates.
> - English (final, never edit): `content/<course>/<subject>/books/<book-slug>/`
> - Hindi output: `content/translations/hi/<course>/<subject>/books/<book-slug>/`, with **exactly the same file names**.
> - For your chapters, write `NN-*.md` and `NN-*.quiz.yaml`; batch 1 also writes `book.yaml`.
> - Notes: `.superpowers/sdd/book-<slug>/notes-hi-<batch>.md`. Touch nothing else. Never run git; never push without
>   `--dry`.
>
> **What to translate.** Copy each English file and translate only the text.
> - In `book.yaml`: `title` and `description`. Keep `position`, `author` and `edition`.
> - In chapters: `title` and the body. Keep `slug`, `number` and `covers`. Keep `## Gist` and `## Key facts` in English
>   exactly. `*Book pages X–Y.*` → `*पुस्तक पृष्ठ X–Y.*`; `⚠ May be outdated:` → `⚠ संभवतः पुराना तथ्य:`.
>   Keep the same number of paragraphs and of key-fact bullets, in the same order, with the bold on the same facts.
> - In quizzes: only `stem`, each option's text and `explanation`. Keep byte-identical:
>   - every `slug`, `difficulty`, `answer`, `source` and `tags`;
>   - the option letters and their order, and the question order (no question may be dropped);
>   - the YAML layout, the blank lines in `stem: |` blocks, table pipes, match codes like `a-3, b-2` and statement
>     numbers.
>
>   Inside double-quoted strings use ‘ ’ instead of `"`.
>
> **Accuracy first.** Never add, drop or soften a fact. Every digit sequence must survive unchanged: use Western
> digits (1857, not १८५७), and don't turn digits into words or words into digits. If a sentence is ambiguous, translate
> it literally and note the slug.
>
> **Terminology.** Follow `.claude/skills/book-to-content/hindi-glossary.md`: standard Hindi exam terms, the English in
> brackets on first use in each chapter, proper names in Devanagari, and the fixed question phrasings.
>
> **Per chapter:**
> 1. Run `node .claude/skills/book-to-content/check-translation.cjs content/<course>/<subject>/books/<book-slug> <NN>`.
>    It must say `No problems.` (acronym or code options excepted).
> 2. Run `npm run content:push -- --dry` and fix the issues in your files.
> 3. Append `Ch NN — done — <questions> — unsure: …` to your notes file.
>
> Return those lines plus any terminology the owner should review.

## Step 3: Finish

1. Run both checks once more on the whole book: `check-translation.cjs` and `npm run content:push -- --dry`.
2. **Load locally:** check that `.env.local` points at `127.0.0.1` or `localhost`, then run `npm run content:push`.
   Never use `.env.cloud`, and never touch production.
3. **Commit** on a new branch `content/<book-slug>`, adding only the English book folder and its Hindi mirror (plus
   `hindi-glossary.md` if you extended it). Message: `content: <title> — <N> chapters, <Q> questions, English + Hindi`.
   Don't push.
4. **Report.** Write `.superpowers/sdd/book-<slug>/report.md` and return the same, short:
   - chapters and E/M/H counts, and the answer-letter spread;
   - pages that couldn't be read;
   - questions to review (by slug);
   - the book's own errors found;
   - outdated-fact flags;
   - translation terms to review;
   - whether web search was used;
   - the final check outputs;
   - the branch name.

   End with: "Review it locally at /courses/<course>/<subject>/books/<book-slug>. Say 'push to prod' when it looks
   right."

## Notes from the first run (Spectrum, Nov 2026)

- **Volume:** 39 chapters, 1,410 English questions, plus a Hindi translation of all of it. About 11 parallel agents
  per phase worked well.
- **Translation choices to keep:**
  - "million" stays मिलियन so the figures match the book;
  - spelled-out English numbers stay as words, so trap questions still work;
  - the book's garbled spellings are replaced with the standard form, e.g. Sarabji → सोराबजी.
- **Errors in the book itself:** list them in the report and in key facts, never in a question's answer.
