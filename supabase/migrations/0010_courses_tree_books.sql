-- Courses: the `subjects` table holds courses (e.g. General Studies); `topics` becomes a syllabus tree of any
-- depth (a top-level topic is a subject such as History). Books with chapter gists and end-of-chapter quizzes
-- sit on a subject; chapters are tagged with the tree nodes they cover.

-- ---------------------------------------------------------------------------
-- Tree
-- ---------------------------------------------------------------------------
alter table public.topics
  add column parent_id uuid references public.topics (id) on delete cascade,
  add column path text;
update public.topics set path = slug where path is null;
alter table public.topics alter column path set not null;
alter table public.topics drop constraint topics_subject_id_slug_key;
alter table public.topics add constraint topics_subject_id_path_key unique (subject_id, path);
create index topics_parent_idx on public.topics (parent_id);

-- A missing path is derived from the parent's path and the slug ("history/ancient" + "india").
create function public.topics_fill_path()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.path is null then
    new.path := coalesce((select p.path || '/' from public.topics p where p.id = new.parent_id), '') || new.slug;
  end if;
  return new;
end;
$$;
create trigger topics_fill_path before insert on public.topics
  for each row execute function public.topics_fill_path();

-- ---------------------------------------------------------------------------
-- Books
-- ---------------------------------------------------------------------------
create table public.books (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics (id) on delete cascade, -- the subject node
  slug text not null,
  title text not null,
  author text,
  edition text,
  description text not null default '',
  position int not null default 0,
  published boolean not null default true,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (topic_id, slug)
);

create table public.book_chapters (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  slug text not null,
  number int not null,
  title text not null,
  gist_md text not null,
  position int not null default 0,
  updated_at timestamptz not null default now(),
  unique (book_id, slug)
);

create table public.chapter_topics (
  chapter_id uuid not null references public.book_chapters (id) on delete cascade,
  topic_id uuid not null references public.topics (id) on delete cascade,
  primary key (chapter_id, topic_id)
);
create index chapter_topics_topic_idx on public.chapter_topics (topic_id);

create table public.chapter_progress (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  chapter_id uuid not null references public.book_chapters (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, chapter_id)
);

alter table public.questions add column chapter_id uuid references public.book_chapters (id) on delete restrict;
alter table public.questions drop constraint questions_topic_xor_month;
alter table public.questions add constraint questions_one_home
  check (num_nonnulls(topic_id, ca_month_id, chapter_id) = 1);
create index questions_chapter_idx on public.questions (chapter_id);

alter type public.test_kind add value if not exists 'chapter';
alter table public.tests add column chapter_id uuid references public.book_chapters (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Grants and RLS (start from nothing on new tables; service_role for the CLIs)
-- ---------------------------------------------------------------------------
revoke all on public.books, public.book_chapters, public.chapter_topics, public.chapter_progress from anon, authenticated;
grant select on public.books, public.book_chapters, public.chapter_topics to authenticated;
grant select, insert, delete on public.chapter_progress to authenticated;
grant select (chapter_id) on public.questions to authenticated;
grant all on public.books, public.book_chapters, public.chapter_topics, public.chapter_progress to service_role;

alter table public.books enable row level security;
alter table public.book_chapters enable row level security;
alter table public.chapter_topics enable row level security;
alter table public.chapter_progress enable row level security;

create policy "published books" on public.books
  for select to authenticated using (published);
create policy "chapters of visible books" on public.book_chapters
  for select to authenticated using (exists (select 1 from public.books b where b.id = book_id));
create policy "tags of visible chapters" on public.chapter_topics
  for select to authenticated using (exists (select 1 from public.book_chapters c where c.id = chapter_id));
create policy "own chapter ticks" on public.chapter_progress
  for select to authenticated using (user_id = (select auth.uid()));
create policy "record own chapter ticks" on public.chapter_progress
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "remove own chapter ticks" on public.chapter_progress
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------
-- A node and all its descendants.
create function public.topic_subtree(p_topic_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  with recursive t(id) as (
    select p_topic_id
    union all
    select c.id from public.topics c join t on c.parent_id = t.id
  )
  select id from t
$$;
revoke execute on function public.topic_subtree(uuid) from public, anon, authenticated;
grant execute on function public.topic_subtree(uuid) to service_role;

-- Practice over tree nodes: every live question in their subtrees, plus quiz questions of published books'
-- chapters tagged with any node in those subtrees.
create or replace function public.create_custom_test(
  p_topic_ids uuid[],
  p_count int,
  p_duration_sec int default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  topic_names text;
  first_subject uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in to create a test' using errcode = 'P0001';
  end if;
  if p_count is null or p_count < 5 or p_count > 50 then
    raise exception 'Choose between 5 and 50 questions' using errcode = 'P0001';
  end if;
  if coalesce(array_length(p_topic_ids, 1), 0) = 0 then
    raise exception 'Pick at least one topic' using errcode = 'P0001';
  end if;
  if p_duration_sec is not null and p_duration_sec <= 0 then
    raise exception 'The time limit must be positive' using errcode = 'P0001';
  end if;

  select string_agg(name, ', ' order by position, name), (array_agg(subject_id))[1]
    into topic_names, first_subject
    from public.topics where id = any (p_topic_ids);
  if topic_names is null then
    raise exception 'Topic not found' using errcode = 'P0001';
  end if;

  create temporary table pool on commit drop as
    with nodes as (
      select distinct s.id from unnest(p_topic_ids) as t(id), lateral public.topic_subtree(t.id) as s(id)
    )
    select q.id, random() as r
      from public.questions q
     where not q.retired
       and (q.topic_id in (select id from nodes)
            or q.chapter_id in (
              select ct.chapter_id
                from public.chapter_topics ct
                join public.book_chapters ch on ch.id = ct.chapter_id
                join public.books b on b.id = ch.book_id and b.published
               where ct.topic_id in (select id from nodes)));
  if not exists (select 1 from pool) then
    drop table pool;
    raise exception 'There are no questions in these topics yet' using errcode = 'P0001';
  end if;

  insert into public.tests (title, kind, subject_id, created_by, duration_sec, marks_correct, marks_wrong, published, published_at)
  values ('Practice: ' || topic_names, 'custom', first_subject, auth.uid(), p_duration_sec, 1, 0, true, now())
  returning id into new_id;

  insert into public.test_questions (test_id, question_id, position)
  select new_id, id, row_number() over (order by r) from (select id, r from pool order by r limit p_count) s;
  drop table pool;
  return new_id;
end;
$$;


-- get_attempt / get_attempt_review: 0008 definitions with chapter labels added.
create or replace function public.get_attempt(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.attempts;
  t public.tests;
  qs jsonb;
begin
  a := public._own_attempt(p_attempt_id);
  if public._is_expired(a) then
    perform public.submit_attempt(a.id);
    a := public._own_attempt(p_attempt_id);
  end if;
  select * into t from public.tests where id = a.test_id;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', q.id,
           'position', tq.position,
           'topic_name', coalesce(tp.name, ch.title || ' · ' || bk.title, c.name || ' · ' || to_char(m.month, 'Mon YYYY')),
           'stem_md', q.stem_md,
           'options', q.options,
           'selected_key', aa.selected_key,
           'marked', coalesce(aa.marked, false),
           'result', case
             when a.submitted_at is not null or (a.mode = 'practice' and coalesce(aa.checked, false)) then
               jsonb_build_object(
                 'is_correct', coalesce(aa.selected_key = q.correct_key, false),
                 'correct_key', q.correct_key,
                 'explanation_md', q.explanation_md)
             end
         ) order by tq.position), '[]'::jsonb)
    into qs
    from public.test_questions tq
    join public.questions q on q.id = tq.question_id
    left join public.topics tp on tp.id = q.topic_id
    left join public.ca_months m on m.id = q.ca_month_id
    left join public.ca_categories c on c.slug = q.ca_category_slug
    left join public.book_chapters ch on ch.id = q.chapter_id
    left join public.books bk on bk.id = ch.book_id
    left join public.attempt_answers aa on aa.attempt_id = a.id and aa.question_id = q.id
   where tq.test_id = a.test_id;

  return jsonb_build_object(
    'attempt', jsonb_build_object(
      'id', a.id, 'mode', a.mode, 'started_at', a.started_at,
      'deadline_at', a.deadline_at, 'submitted_at', a.submitted_at),
    'server_now', now(),
    'test', jsonb_build_object(
      'id', t.id, 'title', t.title, 'kind', t.kind, 'duration_sec', t.duration_sec,
      'marks_correct', t.marks_correct, 'marks_wrong', t.marks_wrong),
    'questions', qs);
end;
$$;

create or replace function public.get_attempt_review(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.attempts;
  t public.tests;
  qs jsonb;
begin
  a := public._own_attempt(p_attempt_id);
  if public._is_expired(a) then
    perform public.submit_attempt(a.id);
    a := public._own_attempt(p_attempt_id);
  end if;
  if a.submitted_at is null then
    raise exception 'Submit the attempt first' using errcode = 'P0001';
  end if;
  select * into t from public.tests where id = a.test_id;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', q.id,
           'position', tq.position,
           'topic_name', coalesce(tp.name, ch.title || ' · ' || bk.title, c.name || ' · ' || to_char(m.month, 'Mon YYYY')),
           'stem_md', q.stem_md,
           'options', q.options,
           'selected_key', aa.selected_key,
           'marked', coalesce(aa.marked, false),
           'correct_key', q.correct_key,
           'explanation_md', q.explanation_md,
           'is_correct', coalesce(aa.selected_key = q.correct_key, false)
         ) order by tq.position), '[]'::jsonb)
    into qs
    from public.test_questions tq
    join public.questions q on q.id = tq.question_id
    left join public.topics tp on tp.id = q.topic_id
    left join public.ca_months m on m.id = q.ca_month_id
    left join public.ca_categories c on c.slug = q.ca_category_slug
    left join public.book_chapters ch on ch.id = q.chapter_id
    left join public.books bk on bk.id = ch.book_id
    left join public.attempt_answers aa on aa.attempt_id = a.id and aa.question_id = q.id
   where tq.test_id = a.test_id;

  return jsonb_build_object(
    'attempt', jsonb_build_object(
      'id', a.id, 'mode', a.mode, 'started_at', a.started_at, 'submitted_at', a.submitted_at,
      'score', a.score, 'n_correct', a.n_correct, 'n_wrong', a.n_wrong, 'n_skipped', a.n_skipped),
    'test', jsonb_build_object(
      'id', t.id, 'title', t.title, 'kind', t.kind,
      'marks_correct', t.marks_correct, 'marks_wrong', t.marks_wrong),
    'questions', qs);
end;
$$;
