-- The content CLI replaces a test's question list in one transaction, so a failure never leaves a test empty.
create function public.replace_test_questions(p_test_id uuid, p_question_ids uuid[])
returns void
language plpgsql
set search_path = public
as $$
begin
  delete from public.test_questions where test_id = p_test_id;
  insert into public.test_questions (test_id, question_id, position)
  select p_test_id, q.id, q.ord::int
    from unnest(p_question_ids) with ordinality as q(id, ord);
end;
$$;

revoke execute on function public.replace_test_questions(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.replace_test_questions(uuid, uuid[]) to service_role;
