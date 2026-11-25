---
name: study-content-writing
description: Use when writing, restructuring or translating a QuizMaster study page (a book chapter, a topic section, a short note or a month of current affairs) in English or Hindi; when a page reads as a dense gist plus a flat list of repeated key facts; when a Hindi page reads like word-for-word or compressed translation; or when asked to "fix the content", "restructure the chapter" or "improve the Hindi".
---

# Writing study pages (English and Hindi)

A study page is read on a phone by a student preparing for BPSC or SSC. **They should be able to read it once, top to
bottom, and later revise from it in a few minutes.** A page that makes them read every fact twice, or organise the
facts themselves, has failed, however accurate it is.

This skill covers the page (`NN-<slug>.md`). Quiz files (`.quiz.yaml`) are not changed by it. File format and
frontmatter are in `docs/content-format.md`.

## The page, in order

Every page is one merged document. There is no separate "Gist" and "Key facts".

1. **Source line**, if the old page had one: keep it as the first line, as plain text (`Book pages 21–58.`, no
   italics).
2. **At a glance** (`## At a glance: …`): when the chapter has several comparable things (powers, movements, acts,
   commissions, phases), one overview table of them. Leave this part out when nothing is comparable.
3. **Background** (`## Why …` / `## Background`): the causes that lead into the chapter, as a short numbered
   cause-to-effect sequence in date order. Leave it out when the source has none.
4. **The main sections**: one `##` or `###` section per natural unit of the chapter. Pick **one** organising axis
   and keep to it:
   - by **entity** (each power, each leader, each organisation), or
   - by **phase** in time order (each movement, each viceroy's term), or
   - by **theme** (administration, economy, society) when the chapter is thematic.

   Inside every unit use the **same sub-headings in the same order**, wherever the source has material for them
   (for example: Arrival, Key people, Settlements, Relations with Indian rulers, Causes of decline). A sub-heading
   with nothing under it is left out, not filled.

   **Small units:** when a unit has about five facts or fewer (one of eleven emperors, one of nine states), give it
   its heading and one short list in date order, with no sub-headings. When such units are comparable, a table row
   each is better still.
5. **Comparison tables** for things that are compared across units (wars, sessions, acts, treaties):
   what happened, the result.
6. **Reasons** (`## Why …`): a numbered list. Each reason carries its supporting fact in the same item, when the
   source gives one. Put it straight after the section it explains, or near the end when it explains the whole
   chapter.
7. **Remember**: the last thing on the page, a callout with 8 to 10 firsts, dates and numbers worth revising.

   ```
   > **Remember**
   >
   > - **May 1498:** Vasco da Gama reached Calicut.
   ```

   In Hindi the title is `> **याद रखें**`. Do not put a heading above the callout: its title is the heading.

`##` is the top level (never `#`). The model page is chapter 3 of the Spectrum book, in both languages:
`content/gs/history/books/spectrum-modern-india/03-advent-of-europeans.md` and the same path under
`content/translations/hi/`. Read both before your first page.

## Rules for the facts

- **Keep every fact.** Every name, date, number, place and term of the page you are rewriting appears in the new
  page. Work through the old key facts one by one before you finish.
- **Add no facts.** No name, date, number, cause or result from your own knowledge, even an obvious one. When a section plainly needs something the
  source lacks (the cause of a war, the terms of a treaty), leave it out of the page and list it in the suggestions
  file (below).
- **Say each fact once.** Its details live in one place. A fact may appear a second time only:
  - in the At-a-glance table and the Remember callout;
  - as a row of a comparison table (name and year, then what the table compares);
  - as a pointer, when a second section needs the event to make sense: name it with its year and stop
    ("after the Third Battle of Panipat (1761)"), without retelling it.
- **Joining is fine, inferring is not.** Two source lines about the same thing may become one sentence if it says
  only what the two lines say.
- **Date order** inside every section, list and table.
- **Keep the page's warnings.** A line such as "⚠ May be outdated: …" or "Book inconsistency: … verify" stays, next
  to the fact it is about.
- When the source is ambiguous or contradicts itself, keep what it says, in the most neutral wording, and note it in
  the suggestions file. Never resolve it from memory.

## Rules for the writing

- **One idea per sentence.** Don't join unrelated facts with "and" / "और".
- **Full sentences.** Expand telegraphic notes: not "three bases against one", but "The English had three bases. The
  French had only one."
- **Paragraphs of at most 3 sentences.** Longer material becomes a list or a table.
- **Tables only for comparable items**, at most 4 columns, short cell text (a phone is 360px wide). **Numbered lists**
  for sequences and reasons, **bullets** for unordered facts.
- **Bold** only the lead of a list item: the date it happened, or the name or term the item is about
  (`- **1510:** Albuquerque took Goa…`, `- **Tinkathia system:** …`). No bold inside paragraphs or tables, except a
  term at the point where it is explained. No italics anywhere.
- **Explain a term on first use**, in eight words or fewer, then use it plainly (a "factory" was a trading post;
  "jaziya" was a tax on non-Muslims). This is the one thing you may write that the source does not: the plain meaning
  of a word, only when you are sure of it, never a date, name or event. List every explanation you add in the
  suggestions file. If you are not sure of a meaning, leave the term unexplained and list it there instead.
- **One spelling per name.** When the old page spells a name two ways, pick the commoner one and use it everywhere,
  and list the change under Reworded.
- **Abbreviations** are written out on first use (`Hindustan Republican Association (HRA)`); that counts as an
  explanation, so list it.
- Plain Markdown with GFM tables. No raw `{ }` or `< >`, no HTML, no footnotes.

## Hindi

Write the English page first. The Hindi page is **the same page in Hindi**: same sections in the same order, the same
tables row for row, the same list items, the same numbers. It is not a second, independent rewrite.

- **Translate meaning, not words.** Write the sentence a good Hindi-medium teacher would write on the board. If a
  sentence reads like English word order, rewrite it.
- **Register:** the standard Hindi of NCERT books and BPSC papers. Not Sanskritised officialese, not Hinglish.
- **Terms:** use the established exam term from `.claude/skills/book-to-content/hindi-glossary.md` (संविधान सभा,
  गोलमेज़ सम्मेलन, सविनय अवज्ञा). If a term is not there, use the one NCERT uses.
- **English gloss in brackets only on the first use** of a proper noun or technical term that students also meet in
  English: `नीले पानी की नीति (Blue Water Policy)`. After that, Hindi only.
- **Names:** the common Hindi spelling (वास्को डी गामा, डूप्ले, क्लाइव). Use the nukta consistently
  (फ़रमान, क़िला, ज़मींदार) and spell a name the same way everywhere on the page.
- **Digits and dates:** western digits, the same format as English (`22 जनवरी 1760`, `1740–48`, `60 प्रतिशत`).
  Keep amounts in the same unit and digits as the English, so the two can be compared.
- **Headings and table headers are translated too.** Keep them short.
- **Glosses the old Hindi page already had** (तख़्त-ए-ताऊस for the Peacock Throne, an alternative Hindi name) stay,
  even though the English page has no counterpart.
- **One spelling per name**, in Hindi as in English (see the writing rules).

## Suggestions file

Write things for the owner to review to
`.superpowers/sdd/reading/suggestions/<book-or-topic>/<NN-slug>.md`, never into the page:

- **Suggested additions:** what the page needs that the source lacks.
- **Ambiguities and contradictions** in the source, and how you worded them.
- **Judgement calls:** anything you placed, merged or labelled that the source does not state outright.
- **Explanations added:** every term meaning you wrote that is not in the source.
- **Terms:** Hindi terms you had to settle that are not in the glossary (English, then the Hindi you used).
- **Reworded** (`## Reworded`, one per line as `- <old word> -> <what the page says now>`): a bolded word of the old
  page that is deliberately gone because it was only reworded: a spelling variant you unified, a number now in
  digits. The check script reads this list. A name, place or term that is simply missing does not belong here: put it
  back on the page.

## Check before you finish

Run from the repo root and fix every `ERROR`; read every `WARN` and fix it or say why it stands:

```
node .claude/skills/study-content-writing/check-page.mjs content/<path>/NN-<slug>.md
npm run content:push -- --dry
```

The script reads the old page with `git show` (read-only; that is expected even when you were told not to run git).
It checks that no number or bolded term of the old page was lost, that the shape rules above hold, and that
the Hindi page has the same skeleton and numbers as the English one. It cannot tell whether a fact is still attached
to the right event, whether events are in date order, or whether the Hindi reads well: read both pages through once
yourself for that. **Never reword the page just to satisfy the script.** If it flags a word you reworded on purpose,
use the Reworded list.

Never run `content:push` without `--dry` and never run git unless the person who gave you the task said to.

## Common mistakes

| Mistake | Instead |
|---|---|
| Keeping "Gist" and "Key facts" under new names (an essay, then a fact list) | One merged page; each fact lives in its section |
| A different set of sub-headings for each unit | The same sub-headings, in the same order, wherever there is material |
| Filling a thin section from memory | Leave it thin; put the gap in the suggestions file |
| Sub-headings over one or two facts | A heading and a short dated list, or a table row |
| Bolding names and numbers all through a sentence | Bold the lead of the list item only |
| Adding a bracket or a clumsy phrase so the checker passes | Write the page well; use the Reworded list |
| A table for things that aren't comparable, or with 5+ columns | A list; or split the table |
| Hindi that keeps English word order, or glosses every term every time | Rewrite the sentence in natural Hindi; gloss once |
| Restructuring the Hindi differently from the English | Mirror the English page section by section |
| Putting notes to the owner at the end of the page | The suggestions file |
