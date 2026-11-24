-- Exams and their previous-year papers. An exam (BPSC, SSC CGL, SSC CHSL …) groups official papers; a paper is a
-- tests row of kind 'pyq' with its exam, date and label (shift / set). A paper's questions belong to the paper
-- (questions.paper_test_id) unless the content tags them to a syllabus node, in which case they also join practice.

create table public.exams (
  slug text primary key,
  name text not null,
  name_hi text,
  description text not null default '',
  description_hi text,
  position int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.exams enable row level security;
create policy "exams" on public.exams for select to authenticated using (true);
revoke all on public.exams from anon, authenticated;
grant select on public.exams to authenticated;
grant all on public.exams to service_role;

alter table public.tests
  add column exam_slug text references public.exams (slug) on update cascade on delete restrict,
  add column paper_date date,
  add column paper_label text;
create index tests_exam_idx on public.tests (exam_slug, year desc);

alter table public.questions add column paper_test_id uuid references public.tests (id) on delete restrict;
create index questions_paper_idx on public.questions (paper_test_id);
alter table public.questions drop constraint questions_one_home;
alter table public.questions add constraint questions_one_home
  check (num_nonnulls(topic_id, ca_month_id, chapter_id, paper_test_id) = 1);
grant select (paper_test_id) on public.questions to authenticated;

-- Question labels fall back to the paper's title for untagged paper questions.

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
           'topic_name', coalesce(tp.name, ch.title || ' · ' || bk.title, c.name || ' · ' || to_char(m.month, 'Mon YYYY'), pt.title),
           'stem_md', q.stem_md, 'stem_md_hi', q.stem_md_hi,
           'options', q.options, 'options_hi', q.options_hi,
           'selected_key', aa.selected_key,
           'marked', coalesce(aa.marked, false),
           'result', case
             when a.submitted_at is not null or (a.mode = 'practice' and coalesce(aa.checked, false)) then
               jsonb_build_object(
                 'is_correct', coalesce(aa.selected_key = q.correct_key, false),
                 'correct_key', q.correct_key,
                 'explanation_md', q.explanation_md,
                 'explanation_md_hi', q.explanation_md_hi)
             end
         ) order by tq.position), '[]'::jsonb)
    into qs
    from public.test_questions tq
    join public.questions q on q.id = tq.question_id
    left join public.topics tp on tp.id = q.topic_id
    left join public.ca_months m on m.id = q.ca_month_id
    left join public.ca_categories c on c.slug = q.ca_category_slug
    left join public.book_chapters ch on ch.id = q.chapter_id
    left join public.tests pt on pt.id = q.paper_test_id
    left join public.books bk on bk.id = ch.book_id
    left join public.attempt_answers aa on aa.attempt_id = a.id and aa.question_id = q.id
   where tq.test_id = a.test_id;

  return jsonb_build_object(
    'attempt', jsonb_build_object(
      'id', a.id, 'mode', a.mode, 'started_at', a.started_at,
      'deadline_at', a.deadline_at, 'submitted_at', a.submitted_at),
    'server_now', now(),
    'test', jsonb_build_object(
      'id', t.id, 'title', t.title, 'title_hi', t.title_hi, 'kind', t.kind, 'duration_sec', t.duration_sec,
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
           'topic_name', coalesce(tp.name, ch.title || ' · ' || bk.title, c.name || ' · ' || to_char(m.month, 'Mon YYYY'), pt.title),
           'stem_md', q.stem_md, 'stem_md_hi', q.stem_md_hi,
           'options', q.options, 'options_hi', q.options_hi,
           'selected_key', aa.selected_key,
           'marked', coalesce(aa.marked, false),
           'correct_key', q.correct_key,
           'explanation_md', q.explanation_md, 'explanation_md_hi', q.explanation_md_hi,
           'is_correct', coalesce(aa.selected_key = q.correct_key, false)
         ) order by tq.position), '[]'::jsonb)
    into qs
    from public.test_questions tq
    join public.questions q on q.id = tq.question_id
    left join public.topics tp on tp.id = q.topic_id
    left join public.ca_months m on m.id = q.ca_month_id
    left join public.ca_categories c on c.slug = q.ca_category_slug
    left join public.book_chapters ch on ch.id = q.chapter_id
    left join public.tests pt on pt.id = q.paper_test_id
    left join public.books bk on bk.id = ch.book_id
    left join public.attempt_answers aa on aa.attempt_id = a.id and aa.question_id = q.id
   where tq.test_id = a.test_id;

  return jsonb_build_object(
    'attempt', jsonb_build_object(
      'id', a.id, 'mode', a.mode, 'started_at', a.started_at, 'submitted_at', a.submitted_at,
      'score', a.score, 'n_correct', a.n_correct, 'n_wrong', a.n_wrong, 'n_skipped', a.n_skipped),
    'test', jsonb_build_object(
      'id', t.id, 'title', t.title, 'title_hi', t.title_hi, 'kind', t.kind,
      'marks_correct', t.marks_correct, 'marks_wrong', t.marks_wrong),
    'questions', qs);
end;
$$;
