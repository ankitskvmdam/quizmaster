-- Hindi content beside English. Every text column a learner reads gets a nullable *_hi twin; the app shows Hindi
-- by default and falls back to English per field when the Hindi is missing. Each person picks their content language.
-- Answers and explanations stay hidden exactly as before: explanation_md_hi is never granted to signed-in users.

alter table public.subjects      add column name_hi text, add column description_hi text;
alter table public.topics        add column name_hi text, add column description_hi text;
alter table public.lessons       add column title_hi text, add column body_md_hi text;
alter table public.books         add column title_hi text, add column description_hi text;
alter table public.book_chapters add column title_hi text, add column gist_md_hi text;
alter table public.tests         add column title_hi text;
alter table public.questions     add column stem_md_hi text, add column options_hi jsonb, add column explanation_md_hi text;

alter table public.profiles add column content_lang text not null default 'hi'
  constraint profiles_content_lang_check check (content_lang in ('hi', 'en'));

-- Column grants: the readable Hindi twins of readable English columns. explanation_md_hi is deliberately absent.
grant select (stem_md_hi, options_hi) on public.questions to authenticated;
grant update (content_lang) on public.profiles to authenticated;
grant all on public.questions, public.profiles to service_role;

-- The runner and review return both languages; the page picks one.

create or replace function public.save_answer(
  p_attempt_id uuid,
  p_question_id uuid,
  p_selected_key text,
  p_marked boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.attempts;
  q public.questions;
  was_checked boolean;
begin
  a := public._own_attempt(p_attempt_id);
  if a.submitted_at is not null then
    raise exception 'This attempt has been submitted' using errcode = 'P0001';
  end if;
  if public._is_expired(a) then
    raise exception 'Time is up for this attempt' using errcode = 'P0001';
  end if;

  select q2.* into q
    from public.questions q2
    join public.test_questions tq on tq.question_id = q2.id and tq.test_id = a.test_id
   where q2.id = p_question_id;
  if q.id is null then
    raise exception 'Question is not part of this test' using errcode = 'P0001';
  end if;
  if p_selected_key is not null
     and not exists (select 1 from jsonb_array_elements(q.options) o where o->>'key' = p_selected_key) then
    raise exception 'Not an option for this question' using errcode = 'P0001';
  end if;

  select checked into was_checked from public.attempt_answers
   where attempt_id = a.id and question_id = q.id;
  if a.mode = 'practice' and coalesce(was_checked, false) then
    raise exception 'This question has already been checked' using errcode = 'P0001';
  end if;

  if a.mode = 'practice' and p_selected_key is not null then
    insert into public.attempt_answers (attempt_id, question_id, selected_key, marked, checked, is_correct)
    values (a.id, q.id, p_selected_key, p_marked, true, p_selected_key = q.correct_key)
    on conflict (attempt_id, question_id) do update
      set selected_key = excluded.selected_key, checked = true,
          is_correct = excluded.is_correct, answered_at = now();
    return jsonb_build_object(
      'is_correct', p_selected_key = q.correct_key,
      'correct_key', q.correct_key,
      'explanation_md', q.explanation_md,
      'explanation_md_hi', q.explanation_md_hi);
  end if;

  insert into public.attempt_answers (attempt_id, question_id, selected_key, marked)
  values (a.id, q.id, p_selected_key, p_marked)
  on conflict (attempt_id, question_id) do update
    set selected_key = excluded.selected_key, answered_at = now();
  return null;
end;
$$;

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
           'topic_name', coalesce(tp.name, ch.title || ' · ' || bk.title, c.name || ' · ' || to_char(m.month, 'Mon YYYY')),
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
