-- Sections under a subject, and monthly current affairs: months, notes by category, read progress.
-- Current-affairs questions live in public.questions, linked to a month and a category, so the attempt
-- functions, review and scoring are reused unchanged. Answers stay hidden by the existing column grant.

create type public.section_kind as enum ('topics', 'current_affairs');

create table public.sections (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete cascade,
  slug text not null,
  name text not null,
  kind public.section_kind not null,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subject_id, slug)
);

alter table public.topics add column section_id uuid references public.sections (id) on delete set null;

create table public.ca_categories (
  slug text primary key,
  name text not null,
  position int not null default 0
);

create table public.ca_months (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.sections (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  published boolean not null default true,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (section_id, month)
);

create table public.ca_notes (
  id uuid primary key default gen_random_uuid(),
  month_id uuid not null references public.ca_months (id) on delete cascade,
  category_slug text not null references public.ca_categories (slug) on update cascade,
  slug text not null,
  happened_on date,
  body_md text not null,
  angle_md text,
  position int not null default 0,
  updated_at timestamptz not null default now(),
  unique (month_id, slug)
);
create index ca_notes_month_category_idx on public.ca_notes (month_id, category_slug);

alter table public.questions alter column topic_id drop not null;
alter table public.questions
  add column ca_month_id uuid references public.ca_months (id) on delete restrict,
  add column ca_category_slug text references public.ca_categories (slug) on update cascade,
  add column retired boolean not null default false,
  add constraint questions_topic_xor_month check ((topic_id is null) <> (ca_month_id is null)),
  add constraint questions_month_has_category check (ca_month_id is null or ca_category_slug is not null);
create index questions_ca_month_idx on public.questions (ca_month_id, ca_category_slug);

alter table public.tests add column ca_month_id uuid references public.ca_months (id) on delete set null;

create table public.ca_progress (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  month_id uuid not null references public.ca_months (id) on delete cascade,
  category_slug text not null references public.ca_categories (slug) on update cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, month_id, category_slug)
);

-- ---------------------------------------------------------------------------
-- Grants: start from nothing on the new tables (Supabase's default privileges grant everything).
-- ---------------------------------------------------------------------------
revoke all on public.sections, public.ca_categories, public.ca_months, public.ca_notes, public.ca_progress
  from anon, authenticated;
grant select on public.sections, public.ca_categories, public.ca_months, public.ca_notes to authenticated;
grant select, insert, delete on public.ca_progress to authenticated;
grant select (ca_month_id, ca_category_slug, retired) on public.questions to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.sections enable row level security;
alter table public.ca_categories enable row level security;
alter table public.ca_months enable row level security;
alter table public.ca_notes enable row level security;
alter table public.ca_progress enable row level security;

create policy "sections of visible subjects" on public.sections
  for select to authenticated using (exists (select 1 from public.subjects s where s.id = subject_id));
create policy "categories" on public.ca_categories
  for select to authenticated using (true);
create policy "published months" on public.ca_months
  for select to authenticated using (published);
create policy "notes of published months" on public.ca_notes
  for select to authenticated using (exists (select 1 from public.ca_months m where m.id = month_id));

create policy "own read ticks" on public.ca_progress
  for select to authenticated using (user_id = (select auth.uid()));
create policy "record own read ticks" on public.ca_progress
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "remove own read ticks" on public.ca_progress
  for delete to authenticated using (user_id = (select auth.uid()));

-- questions keep `using (true)`: reviews of attempts on an unpublished month must still show every question.
-- Browsing reaches current-affairs questions only through ca_months, which RLS filters.

-- ---------------------------------------------------------------------------
-- Backfill: existing topics go into a "Maths & Reasoning" section of their subject.
-- ---------------------------------------------------------------------------
insert into public.sections (subject_id, slug, name, kind, position)
select distinct t.subject_id, 'maths-reasoning', 'Maths & Reasoning', 'topics'::public.section_kind, 2
  from public.topics t
on conflict (subject_id, slug) do nothing;

update public.topics t
   set section_id = s.id
  from public.sections s
 where s.subject_id = t.subject_id and s.slug = 'maths-reasoning' and t.section_id is null;
