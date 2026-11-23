-- Current affairs functions: period tests, retired questions, category labels in attempts.
-- get_attempt, get_attempt_review and create_custom_test are the 0002 definitions with only these changes:
-- current-affairs questions are labelled "<Category> · <Mon YYYY>", and retired questions are never drawn.

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
           'topic_name', coalesce(tp.name, c.name || ' · ' || to_char(m.month, 'Mon YYYY')),
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
           'topic_name', coalesce(tp.name, c.name || ' · ' || to_char(m.month, 'Mon YYYY')),
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
  if not exists (select 1 from public.questions where topic_id = any (p_topic_ids) and not retired) then
    raise exception 'There are no questions in these topics yet' using errcode = 'P0001';
  end if;

  insert into public.tests (title, kind, subject_id, created_by, duration_sec, marks_correct, marks_wrong, published, published_at)
  values ('Custom: ' || topic_names, 'custom', first_subject, auth.uid(), p_duration_sec, 1, 0, true, now())
  returning id into new_id;

  insert into public.test_questions (test_id, question_id, position)
  select new_id, s.id, row_number() over (order by s.r)
    from (select id, random() as r from public.questions where topic_id = any (p_topic_ids) and not retired order by r limit p_count) s;

  return new_id;
end;
$$;
-- ---------------------------------------------------------------------------
-- Practice and revision sets over months of current affairs (one month or up to 12).
-- Marking is always +1 / -0.33. Timed tests get p_seconds_per_question for each question drawn.
-- ---------------------------------------------------------------------------
create function public.create_period_test(
  p_from date,
  p_to date,
  p_categories text[] default null,
  p_count int default 10,
  p_seconds_per_question int default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  span int;
  new_id uuid;
  drawn int;
  subject uuid;
  range_label text;
  cat_label text;
  cat_count int;
begin
  if auth.uid() is null then
    raise exception 'Sign in to create a test' using errcode = 'P0001';
  end if;
  if p_from is null or p_to is null or p_from > p_to then
    raise exception 'Choose a valid period' using errcode = 'P0001';
  end if;
  span := (extract(year from p_to) * 12 + extract(month from p_to))
        - (extract(year from p_from) * 12 + extract(month from p_from)) + 1;
  if span > 12 then
    raise exception 'Choose a period of 12 months or less' using errcode = 'P0001';
  end if;
  if p_count is null or p_count < 5 or p_count > 50 then
    raise exception 'Choose between 5 and 50 questions' using errcode = 'P0001';
  end if;
  if p_seconds_per_question is not null and p_seconds_per_question <= 0 then
    raise exception 'The time per question must be positive' using errcode = 'P0001';
  end if;

  create temporary table pick on commit drop as
    select q.id, random() as r
      from public.questions q
      join public.ca_months m on m.id = q.ca_month_id and m.published
     where m.month between date_trunc('month', p_from)::date and date_trunc('month', p_to)::date
       and not q.retired
       and (p_categories is null or q.ca_category_slug = any (p_categories))
     order by r
     limit p_count;
  select count(*) into drawn from pick;
  if drawn = 0 then
    drop table pick;
    raise exception 'There are no questions for this period yet' using errcode = 'P0001';
  end if;

  select s.subject_id into subject
    from public.ca_months m join public.sections s on s.id = m.section_id
   where m.month between date_trunc('month', p_from)::date and date_trunc('month', p_to)::date
   order by m.month limit 1;

  range_label := case
    when date_trunc('month', p_from) = date_trunc('month', p_to) then to_char(p_from, 'FMMonth YYYY')
    when extract(year from p_from) = extract(year from p_to) then to_char(p_from, 'Mon') || '–' || to_char(p_to, 'Mon YYYY')
    else to_char(p_from, 'Mon YYYY') || '–' || to_char(p_to, 'Mon YYYY')
  end;
  cat_count := coalesce(array_length(p_categories, 1), 0);
  if cat_count between 1 and 3 then
    select string_agg(name, ', ' order by position, name) into cat_label
      from public.ca_categories where slug = any (p_categories);
  elsif cat_count > 3 then
    cat_label := cat_count || ' categories';
  end if;

  insert into public.tests (title, kind, subject_id, created_by, duration_sec, marks_correct, marks_wrong, published, published_at)
  values ('Current affairs: ' || range_label || coalesce(' · ' || cat_label, ''), 'custom', subject, auth.uid(),
          p_seconds_per_question * drawn, 1, -0.33, true, now())
  returning id into new_id;

  insert into public.test_questions (test_id, question_id, position)
  select new_id, id, row_number() over (order by r) from pick;
  drop table pick;
  return new_id;
end;
$$;

revoke execute on function public.create_period_test(date, date, text[], int, int) from public, anon, authenticated;
grant execute on function public.create_period_test(date, date, text[], int, int) to authenticated;
