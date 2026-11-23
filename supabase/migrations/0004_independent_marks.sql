-- Marking and answering are independent writes, so a stale tab can't erase one with the other.
-- set_marked never touches selected_key; save_answer never touches marked once a row exists.

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
      'explanation_md', q.explanation_md);
  end if;

  insert into public.attempt_answers (attempt_id, question_id, selected_key, marked)
  values (a.id, q.id, p_selected_key, p_marked)
  on conflict (attempt_id, question_id) do update
    set selected_key = excluded.selected_key, answered_at = now();
  return null;
end;
$$;

-- Flag or unflag a question for review. Allowed on checked practice questions too.
create function public.set_marked(p_attempt_id uuid, p_question_id uuid, p_marked boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.attempts;
begin
  a := public._own_attempt(p_attempt_id);
  if a.submitted_at is not null then
    raise exception 'This attempt has been submitted' using errcode = 'P0001';
  end if;
  if public._is_expired(a) then
    raise exception 'Time is up for this attempt' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.test_questions where test_id = a.test_id and question_id = p_question_id) then
    raise exception 'Question is not part of this test' using errcode = 'P0001';
  end if;

  insert into public.attempt_answers (attempt_id, question_id, marked)
  values (a.id, p_question_id, p_marked)
  on conflict (attempt_id, question_id) do update set marked = excluded.marked;
end;
$$;

revoke execute on function public.set_marked(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.set_marked(uuid, uuid, boolean) to authenticated;
