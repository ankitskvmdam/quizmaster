-- A third kind of book: one month of current affairs (shown on the "Monthly Current Affairs" shelf).
alter table public.books drop constraint books_kind_check;
alter table public.books add constraint books_kind_check check (kind in ('book', 'topic', 'monthly'));
