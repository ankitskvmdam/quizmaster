-- Attempts: start, load, answer, submit, review, custom tests.
-- All run as SECURITY DEFINER so they can read questions.correct_key, and each checks the caller.
-- Errors are raised as P0001 with a message the UI can show as is.

-- Grace period after the deadline for answers in flight and slow clocks.
create function public._grace() returns interval
language sql immutable as $$ select interval '30 seconds' $$;

-- Returns the caller's attempt or raises 'Attempt not found'.
create function public._own_attempt(p_attempt_id uuid)
returns public.attempts
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.attempts;
begin
  select * into a from public.attempts where id = p_attempt_id;
  if a.id is null or a.user_id is distinct from auth.uid() then
    raise exception 'Attempt not found' using errcode = 'P0001';
  end if;
  return a;
end;
$$;

create function public._is_expired(a public.attempts)
returns boolean
language sql
stable
as $$
  select a.mode = 'timed' and a.submitted_at is null and now() > a.deadline_at + public._grace()
$$;

-- ---------------------------------------------------------------------------
create function public.submit_attempt(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.attempts;
  t public.tests;
  nc int;
  nw int;
  ns int;
  sc numeric;
begin
  a := public._own_attempt(p_attempt_id);

  if a.submitted_at is null then
    select * into t from public.tests where id = a.test_id;

    update public.attempt_answers aa
       set is_correct = case when aa.selected_key is null then null else aa.selected_key = q.correct_key end
      from public.questions q
     where q.id = aa.question_id and aa.attempt_id = a.id;

    select count(*) filter (where aa.is_correct),
           count(*) filter (where aa.is_correct = false)
      into nc, nw
      from public.attempt_answers aa
      join public.test_questions tq on tq.test_id = a.test_id and tq.question_id = aa.question_id
     where aa.attempt_id = a.id and aa.selected_key is not null;

    select count(*) - nc - nw into ns from public.test_questions where test_id = a.test_id;
    sc := nc * t.marks_correct + nw * t.marks_wrong;

    update public.attempts
       set submitted_at = case when a.mode = 'timed' then least(now(), a.deadline_at + public._grace()) else now() end,
           score = sc, n_correct = nc, n_wrong = nw, n_skipped = ns
     where id = a.id
     returning * into a;
  end if;

  return jsonb_build_object('score', a.score, 'n_correct', a.n_correct, 'n_wrong', a.n_wrong, 'n_skipped', a.n_skipped);
end;
$$;

-- ---------------------------------------------------------------------------
create function public.submit_expired_attempts()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  n int := 0;
begin
  for r in
    select id from public.attempts a
     where a.user_id = auth.uid() and public._is_expired(a)
  loop
    perform public.submit_attempt(r.id);
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- ---------------------------------------------------------------------------
create function public.start_attempt(p_test_id uuid, p_mode public.attempt_mode)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.tests;
  existing uuid;
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in to start a test' using errcode = 'P0001';
  end if;

  select * into t from public.tests
   where id = p_test_id
     and ((created_by is null and published) or created_by = auth.uid());
  if t.id is null then
    raise exception 'Test not found' using errcode = 'P0001';
  end if;
  if p_mode = 'timed' and t.duration_sec is null then
    raise exception 'This test can only be taken as practice' using errcode = 'P0001';
  end if;

  select a.id into existing
    from public.attempts a
   where a.user_id = auth.uid() and a.test_id = t.id and a.mode = p_mode
     and a.submitted_at is null and not public._is_expired(a)
   order by a.started_at desc
   limit 1;
  if existing is not null then
    return existing;
  end if;

  insert into public.attempts (user_id, test_id, mode, deadline_at)
  values (auth.uid(), t.id, p_mode,
          case when p_mode = 'timed' then now() + make_interval(secs => t.duration_sec) end)
  returning id into new_id;
  return new_id;
end;
$$;

-- ---------------------------------------------------------------------------
create function public.get_attempt(p_attempt_id uuid)
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
           'topic_name', tp.name,
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
    join public.topics tp on tp.id = q.topic_id
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

-- ---------------------------------------------------------------------------
create function public.save_answer(
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
      set selected_key = excluded.selected_key, marked = excluded.marked, checked = true,
          is_correct = excluded.is_correct, answered_at = now();
    return jsonb_build_object(
      'is_correct', p_selected_key = q.correct_key,
      'correct_key', q.correct_key,
      'explanation_md', q.explanation_md);
  end if;

  insert into public.attempt_answers (attempt_id, question_id, selected_key, marked)
  values (a.id, q.id, p_selected_key, p_marked)
  on conflict (attempt_id, question_id) do update
    set selected_key = excluded.selected_key, marked = excluded.marked, answered_at = now();
  return null;
end;
$$;

-- ---------------------------------------------------------------------------
create function public.get_attempt_review(p_attempt_id uuid)
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
           'topic_name', tp.name,
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
    join public.topics tp on tp.id = q.topic_id
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

-- ---------------------------------------------------------------------------
create function public.create_custom_test(
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
  if not exists (select 1 from public.questions where topic_id = any (p_topic_ids)) then
    raise exception 'There are no questions in these topics yet' using errcode = 'P0001';
  end if;

  insert into public.tests (title, kind, subject_id, created_by, duration_sec, marks_correct, marks_wrong, published, published_at)
  values ('Custom: ' || topic_names, 'custom', first_subject, auth.uid(), p_duration_sec, 1, 0, true, now())
  returning id into new_id;

  insert into public.test_questions (test_id, question_id, position)
  select new_id, s.id, row_number() over (order by s.r)
    from (select id, random() as r from public.questions where topic_id = any (p_topic_ids) order by r limit p_count) s;

  return new_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Execute grants: nothing for anon; the public API only for signed-in users.
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function
  public.start_attempt(uuid, public.attempt_mode),
  public.get_attempt(uuid),
  public.save_answer(uuid, uuid, text, boolean),
  public.submit_attempt(uuid),
  public.submit_expired_attempts(),
  public.get_attempt_review(uuid),
  public.create_custom_test(uuid[], int, int)
to authenticated;
