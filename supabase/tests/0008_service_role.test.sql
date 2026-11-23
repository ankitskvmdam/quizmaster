-- The content and invite CLIs run as service_role. Newer hosted projects don't grant API roles on new tables
-- by default, so the grants must be explicit (cloud returned 403 on every table without them).
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

select ok(
  (select bool_and(has_table_privilege('service_role', format('public.%I', tablename), 'select, insert, update, delete'))
     from pg_tables where schemaname = 'public'),
  'service_role can read and write every public table');
select ok(has_table_privilege('service_role', 'public.questions', 'select'), 'service_role can read questions (incl. answers)');
select ok(has_table_privilege('service_role', 'public.allowed_emails', 'insert'), 'service_role can add invites');
select ok(has_function_privilege('service_role', 'public.replace_test_questions(uuid, uuid[])', 'execute'),
  'service_role can replace a test''s questions');
select ok(
  exists (select 1 from pg_default_acl d join pg_namespace n on n.oid = d.defaclnamespace
           where n.nspname = 'public' and d.defaclobjtype = 'r' and d.defaclacl::text like '%service_role=arwdDxt%'),
  'future tables are granted to service_role too');
select ok(not has_table_privilege('anon', 'public.questions', 'select'), 'anon still has no access to questions');

select * from finish();
rollback;
