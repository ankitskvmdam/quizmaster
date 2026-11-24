-- Topics: a "book" written for one syllabus topic (e.g. Freedom Struggle) rather than a published book. It is stored
-- as a book and shown on its own shelf. A book or topic may also carry one fixed quiz over all of its chapters.
alter table public.books
  add column kind text not null default 'book' check (kind in ('book', 'topic'));

-- The whole-book quiz: a kind='chapter' test (practice, +1/0) that points at the book instead of one chapter.
alter table public.tests add column book_id uuid references public.books (id) on delete set null;
create unique index tests_book_idx on public.tests (book_id) where book_id is not null;
