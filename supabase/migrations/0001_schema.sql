-- QuizMaster schema, RLS and grants.
-- Content tables are written only by the service role (content CLI). Signed-in users read them.
-- questions.correct_key and questions.explanation_md are never granted to signed-in users:
-- answers reach the browser only through the attempt functions (0002_attempts.sql).

create extension if not exists citext with schema extensions;

create type public.test_kind as enum ('mock', 'pyq', 'custom');
create type public.attempt_mode as enum ('timed', 'practice');
create type public.difficulty as enum ('easy', 'medium', 'hard');

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------
create table public.allowed_emails (
  email extensions.citext primary key,
  note text,
  added_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Content
-- ---------------------------------------------------------------------------
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  position int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete cascade,
  slug text not null,
  name text not null,
  description text not null default '',
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subject_id, slug)
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics (id) on delete cascade,
  slug text not null,
  title text not null,
  body_md text not null default '',
  position int not null default 0,
  published boolean not null default true,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (topic_id, slug)
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  topic_id uuid not null references public.topics (id) on delete restrict,
  stem_md text not null,
  options jsonb not null check (jsonb_typeof(options) = 'array'),
  correct_key text not null,
  explanation_md text not null default '',
  difficulty public.difficulty not null default 'medium',
  source text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index questions_topic_id_idx on public.questions (topic_id);

create table public.tests (
  id uuid primary key default gen_random_uuid(),
  slug text unique, -- null for custom tests
  title text not null,
  kind public.test_kind not null,
  subject_id uuid references public.subjects (id) on delete cascade,
  year int,
  duration_sec int check (duration_sec > 0), -- null = practice only
  marks_correct numeric not null default 1 check (marks_correct > 0),
  marks_wrong numeric not null default 0 check (marks_wrong <= 0),
  created_by uuid references auth.users (id) on delete cascade, -- null = official
  published boolean not null default true,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.test_questions (
  test_id uuid not null references public.tests (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete restrict,
  position int not null,
  primary key (test_id, question_id)
);

-- ---------------------------------------------------------------------------
-- Activity
-- ---------------------------------------------------------------------------
create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  test_id uuid not null references public.tests (id) on delete cascade,
  mode public.attempt_mode not null,
  started_at timestamptz not null default now(),
  deadline_at timestamptz, -- timed only
  submitted_at timestamptz,
  score numeric,
  n_correct int,
  n_wrong int,
  n_skipped int
);
create index attempts_user_idx on public.attempts (user_id, started_at desc);

create table public.attempt_answers (
  attempt_id uuid not null references public.attempts (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete restrict,
  selected_key text,
  marked boolean not null default false,
  checked boolean not null default false, -- practice: answer revealed and locked
  is_correct boolean,
  answered_at timestamptz not null default now(),
  primary key (attempt_id, question_id)
);

create table public.lesson_progress (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

-- ---------------------------------------------------------------------------
-- Grants: start from nothing, then grant exactly what the app needs.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;

grant select on public.subjects, public.topics, public.lessons, public.tests, public.test_questions
  to authenticated;
grant select (id, slug, topic_id, stem_md, options, difficulty, source, tags) on public.questions
  to authenticated;
grant select on public.attempts, public.attempt_answers to authenticated;
grant select, insert, delete on public.lesson_progress to authenticated;
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.allowed_emails enable row level security; -- no policies: service role only
alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.topics enable row level security;
alter table public.lessons enable row level security;
alter table public.questions enable row level security;
alter table public.tests enable row level security;
alter table public.test_questions enable row level security;
alter table public.attempts enable row level security;
alter table public.attempt_answers enable row level security;
alter table public.lesson_progress enable row level security;

create policy "own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "update own profile" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "published subjects" on public.subjects
  for select to authenticated using (published);
create policy "topics of published subjects" on public.topics
  for select to authenticated using (exists (select 1 from public.subjects s where s.id = subject_id));
create policy "published lessons" on public.lessons
  for select to authenticated using (published and exists (select 1 from public.topics t where t.id = topic_id));
create policy "questions" on public.questions
  for select to authenticated using (true);
create policy "official or own tests" on public.tests
  for select to authenticated
  using ((created_by is null and published) or created_by = (select auth.uid()));
create policy "questions of visible tests" on public.test_questions
  for select to authenticated using (exists (select 1 from public.tests t where t.id = test_id));

create policy "own attempts" on public.attempts
  for select to authenticated using (user_id = (select auth.uid()));
create policy "answers of own attempts" on public.attempt_answers
  for select to authenticated
  using (exists (select 1 from public.attempts a where a.id = attempt_id and a.user_id = (select auth.uid())));

create policy "own progress" on public.lesson_progress
  for select to authenticated using (user_id = (select auth.uid()));
create policy "record own progress" on public.lesson_progress
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "remove own progress" on public.lesson_progress
  for delete to authenticated using (user_id = (select auth.uid()));
