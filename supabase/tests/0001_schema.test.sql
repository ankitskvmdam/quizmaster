-- Schema, RLS and answer-hiding grants (Task 2).
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

-- Fixtures (as postgres)
insert into public.allowed_emails (email) values ('u1@test.dev'), ('u2@test.dev');
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'u1@test.dev'),
  ('22222222-2222-2222-2222-222222222222', 'u2@test.dev');

insert into public.subjects (id, slug, name) values ('a0000000-0000-0000-0000-000000000001', 'zz-test-gs', 'Test subject');
insert into public.topics (id, subject_id, slug, name)
  values ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'percentages', 'Percentages');
insert into public.lessons (topic_id, slug, title, body_md, published) values
  ('b0000000-0000-0000-0000-000000000001', 'basics', 'Basics', 'Body', true),
  ('b0000000-0000-0000-0000-000000000001', 'draft', 'Draft', 'Body', false);
insert into public.questions (slug, topic_id, stem_md, options, correct_key, explanation_md) values
  ('zz-pct-001', 'b0000000-0000-0000-0000-000000000001', 'What is 10% of 50?',
   '[{"key":"A","text_md":"4"},{"key":"B","text_md":"5"}]', 'B', '50 × 0.1 = 5');
insert into public.tests (slug, title, kind, subject_id)
  values ('zz-mock-1', 'Mock 1', 'mock', 'a0000000-0000-0000-0000-000000000001');
insert into public.tests (title, kind, created_by)
  values ('Custom: Percentages', 'custom', '22222222-2222-2222-2222-222222222222');
insert into public.lesson_progress (user_id, lesson_id)
  select '22222222-2222-2222-2222-222222222222', id from public.lessons where slug = 'basics';

select is((select display_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'u1', 'a profile is created on sign-up with the email name');

-- As user 1
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select throws_ok($$select correct_key from public.questions$$, '42501', null, 'correct_key is hidden from signed-in users');
select throws_ok($$select explanation_md from public.questions$$, '42501', null, 'explanation_md is hidden from signed-in users');
select lives_ok($$select id, slug, topic_id, stem_md, options, difficulty, source, tags from public.questions$$,
  'question stems and options are readable');
select is((select count(*) from public.subjects where slug = 'zz-test-gs'), 1::bigint, 'published subjects are readable');
select is((select count(*) from public.lessons where topic_id = 'b0000000-0000-0000-0000-000000000001'), 1::bigint, 'unpublished lessons are hidden');
select is((select count(*) from public.lesson_progress), 0::bigint, 'another user''s progress is hidden');
select throws_ok(
  $$insert into public.lesson_progress (user_id, lesson_id) select '22222222-2222-2222-2222-222222222222', id from public.lessons limit 1$$,
  '42501', null, 'cannot write another user''s progress');
select lives_ok($$insert into public.lesson_progress (lesson_id) select id from public.lessons where topic_id = 'b0000000-0000-0000-0000-000000000001' limit 1$$,
  'can record own progress');
select is((select count(*) from public.tests where kind = 'custom'), 0::bigint, 'another user''s custom test is hidden');
select throws_ok($$insert into public.subjects (slug, name) values ('x', 'x')$$, '42501', null,
  'signed-in users cannot write content');
select throws_ok($$select * from public.allowed_emails$$, '42501', null, 'the allowlist is not readable');

-- As anon
reset role;
set local role anon;
select throws_ok($$select count(*) from public.subjects$$, '42501', null, 'anon cannot read content');

select * from finish();
rollback;
