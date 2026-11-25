-- A person can delete a test they built (kind 'custom', created_by them). Its attempts go with it (on delete cascade),
-- so they also leave My Attempts. Official tests and other people's tests can't be deleted this way: the function
-- reports "Test not found" for them, exactly as for a test that doesn't exist, so it reveals nothing about them.
create function public.delete_my_test(p_test_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in first' using errcode = 'P0001';
  end if;
  delete from public.tests
   where id = p_test_id
     and kind = 'custom'
     and created_by = auth.uid();
  if not found then
    raise exception 'Test not found' using errcode = 'P0001';
  end if;
end;
$$;

revoke execute on function public.delete_my_test(uuid) from public, anon, authenticated;
grant execute on function public.delete_my_test(uuid) to authenticated, service_role;
