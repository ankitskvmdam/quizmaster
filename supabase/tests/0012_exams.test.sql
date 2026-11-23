-- Exams (BPSC, SSC CGL, SSC CHSL …) with their previous-year papers; paper questions belong to their paper.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into public.allowed_emails (email) values ('exam1@test.dev');
insert into auth.users (id, email) values ('a1111111-1111-1111-1111-111111111111', 'exam1@test.dev');

insert into public.subjects (id, slug, name) values ('a0000000-0000-0000-0000-0000000000c7', 'zz-exam-course', 'Exam course');
insert into public.topics (id, subject_id, slug, path, name) values
  ('b0000000-0000-0000-0000-0000000000c7', 'a0000000-0000-0000-0000-0000000000c7', 'history', 'history', 'History');
insert into public.exams (slug, name, name_hi, position) values ('zz-bpsc', 'ZZ BPSC', 'ज़ज़ बीपीएससी', 1);
insert into public.tests (id, slug, title, kind, subject_id, exam_slug, year, paper_date, paper_label, duration_sec, marks_correct, marks_wrong, published_at) values
  ('c4000000-0000-0000-0000-0000000000c7', 'pyq-zz-69', 'ZZ 69th Prelims', 'pyq', 'a0000000-0000-0000-0000-0000000000c7', 'zz-bpsc', 2023,
   '2023-09-30', 'Set A', 7200, 1, -0.33, now());
insert into public.questions (id, slug, paper_test_id, stem_md, options, correct_key, explanation_md) values
  ('c3000000-0000-0000-0000-0000000000c7', 'zz-pyq-1', 'c4000000-0000-0000-0000-0000000000c7', 'Q1?',
   '[{"key":"A","text_md":"a"},{"key":"B","text_md":"b"}]', 'A', 'x');
insert into public.questions (id, slug, topic_id, stem_md, options, correct_key, explanation_md) values
  ('c3000000-0000-0000-0000-0000000000d7', 'zz-pyq-2', 'b0000000-0000-0000-0000-0000000000c7', 'Q2?',
   '[{"key":"A","text_md":"a"},{"key":"B","text_md":"b"}]', 'B', 'y');
insert into public.test_questions (test_id, question_id, position) values
  ('c4000000-0000-0000-0000-0000000000c7', 'c3000000-0000-0000-0000-0000000000c7', 1),
  ('c4000000-0000-0000-0000-0000000000c7', 'c3000000-0000-0000-0000-0000000000d7', 2);

select throws_ok($$insert into public.questions (slug, topic_id, paper_test_id, stem_md, options, correct_key)
  values ('zz-both', 'b0000000-0000-0000-0000-0000000000c7', 'c4000000-0000-0000-0000-0000000000c7', 'x', '[]', 'A')$$,
  '23514', null, 'a question belongs to exactly one of topic, month, chapter or paper');
select throws_ok($$insert into public.tests (slug, title, kind, exam_slug, marks_correct, marks_wrong) values ('zz-bad', 'x', 'pyq', 'nope', 1, 0)$$,
  '23503', null, 'a paper must name a known exam');
select ok(has_table_privilege('service_role', 'public.exams', 'select, insert, update, delete'), 'the CLIs can write exams');

set local role anon;
select throws_ok($$select count(*) from public.exams$$, '42501', null, 'anon cannot read exams');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub":"a1111111-1111-1111-1111-111111111111","role":"authenticated"}';
create temp table ids (name text primary key, id uuid) on commit drop;

select is((select name_hi from public.exams where slug = 'zz-bpsc'), 'ज़ज़ बीपीएससी', 'signed-in people can read exams');
select is((select paper_label || ' ' || paper_date::text from public.tests where slug = 'pyq-zz-69'), 'Set A 2023-09-30', 'and a paper''s date and label');
select throws_ok($$select correct_key from public.questions where paper_test_id is not null$$, '42501', null, 'paper answers stay hidden');

insert into ids values ('att', public.start_attempt('c4000000-0000-0000-0000-0000000000c7', 'practice'));
select is(public.get_attempt((select id from ids where name = 'att'))->'questions'->0->>'topic_name', 'ZZ 69th Prelims',
  'an untagged paper question is labelled with its paper');
select is(public.get_attempt((select id from ids where name = 'att'))->'questions'->1->>'topic_name', 'History',
  'a paper question tagged to a section is labelled with the section');

select * from finish();
rollback;
