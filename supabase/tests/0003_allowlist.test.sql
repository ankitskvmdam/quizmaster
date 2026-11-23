-- Invite allowlist auth hook (Task 4).
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into public.allowed_emails (email) values ('asha@mail.com');

select is(public.hook_check_allowlist('{"user":{"email":"x@y.com"}}')->'error'->>'http_code', '403',
  'an email that is not invited is rejected with 403');
select is(public.hook_check_allowlist('{"user":{"email":"x@y.com"}}')->'error'->>'message',
  'This email hasn''t been invited yet. Ask the person who shared this link to add you.',
  'the rejection carries the exact sign-up copy');
select is(public.hook_check_allowlist('{"user":{"email":"Asha@Mail.com"}}'), '{}'::jsonb,
  'an invited email is allowed whatever its case');

-- The test runner cannot become supabase_auth_admin, so check what the hook needs it to have.
select ok(has_function_privilege('supabase_auth_admin', 'public.hook_check_allowlist(jsonb)', 'execute'),
  'the auth service role can run the hook');
select ok(has_schema_privilege('supabase_auth_admin', 'extensions', 'usage'),
  'the auth service role can use the extensions schema (citext) the hook compares with');

set local role authenticated;
select throws_ok($$select public.hook_check_allowlist('{}')$$, '42501', null,
  'signed-in users cannot call the hook');
reset role;
set local role anon;
select throws_ok($$select public.hook_check_allowlist('{}')$$, '42501', null,
  'anonymous users cannot call the hook');

select * from finish();
rollback;
