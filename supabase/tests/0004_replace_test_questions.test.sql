-- Atomic replacement of a test's question list, for the content CLI (service role only).
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into public.subjects (id, slug, name) values ('a0000000-0000-0000-0000-000000000009', 'zz-rtq', 'RTQ');
insert into public.topics (id, subject_id, slug, name) values ('b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000009', 't', 'T');
insert into public.questions (id, slug, topic_id, stem_md, options, correct_key) values
  ('c0000000-0000-0000-0000-000000000091', 'zz-rtq-1', 'b0000000-0000-0000-0000-000000000009', 'Q', '[{"key":"A","text_md":"a"},{"key":"B","text_md":"b"}]', 'A'),
  ('c0000000-0000-0000-0000-000000000092', 'zz-rtq-2', 'b0000000-0000-0000-0000-000000000009', 'Q', '[{"key":"A","text_md":"a"},{"key":"B","text_md":"b"}]', 'A');
insert into public.tests (id, slug, title, kind) values ('d0000000-0000-0000-0000-000000000009', 'zz-rtq', 'RTQ', 'mock');
insert into public.test_questions (test_id, question_id, position) values
  ('d0000000-0000-0000-0000-000000000009', 'c0000000-0000-0000-0000-000000000091', 1);

select public.replace_test_questions('d0000000-0000-0000-0000-000000000009',
  array['c0000000-0000-0000-0000-000000000092', 'c0000000-0000-0000-0000-000000000091']::uuid[]);
select is(
  (select array_agg(question_id order by position) from public.test_questions where test_id = 'd0000000-0000-0000-0000-000000000009'),
  array['c0000000-0000-0000-0000-000000000092', 'c0000000-0000-0000-0000-000000000091']::uuid[],
  'the question list is replaced in the given order');

select throws_ok($$select public.replace_test_questions('d0000000-0000-0000-0000-000000000009',
  array['c0000000-0000-0000-0000-000000000092', 'c0000000-0000-0000-0000-0000000000ff']::uuid[])$$,
  '23503', null, 'an unknown question fails the whole replacement');
select is((select count(*) from public.test_questions where test_id = 'd0000000-0000-0000-0000-000000000009'), 2::bigint,
  'after a failed replacement the old list is still there');

set local role authenticated;
select throws_ok($$select public.replace_test_questions('d0000000-0000-0000-0000-000000000009', array[]::uuid[])$$,
  '42501', null, 'signed-in users cannot rewrite test questions');

select * from finish();
rollback;
