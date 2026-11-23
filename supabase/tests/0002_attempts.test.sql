-- Attempt, scoring, review and custom-test functions (Task 3).
begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

-- Fixtures
insert into public.allowed_emails (email) values ('u1@test.dev'), ('u2@test.dev');
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'u1@test.dev'),
  ('22222222-2222-2222-2222-222222222222', 'u2@test.dev');
insert into public.subjects (id, slug, name) values ('a0000000-0000-0000-0000-000000000001', 'zz-test-gs', 'Test subject');
insert into public.topics (id, subject_id, slug, name, position) values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'percentages', 'Percentages', 1),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'ratios', 'Ratios', 2);
insert into public.questions (id, slug, topic_id, stem_md, options, correct_key, explanation_md) values
  ('c0000000-0000-0000-0000-000000000001', 'zz-q1', 'b0000000-0000-0000-0000-000000000001', 'Q1',
   '[{"key":"A","text_md":"a"},{"key":"B","text_md":"b"},{"key":"C","text_md":"c"},{"key":"D","text_md":"d"}]', 'B', 'Because B'),
  ('c0000000-0000-0000-0000-000000000002', 'zz-q2', 'b0000000-0000-0000-0000-000000000001', 'Q2',
   '[{"key":"A","text_md":"a"},{"key":"B","text_md":"b"},{"key":"C","text_md":"c"},{"key":"D","text_md":"d"}]', 'A', 'Because A'),
  ('c0000000-0000-0000-0000-000000000003', 'zz-q3', 'b0000000-0000-0000-0000-000000000001', 'Q3',
   '[{"key":"A","text_md":"a"},{"key":"B","text_md":"b"},{"key":"C","text_md":"c"},{"key":"D","text_md":"d"}]', 'C', 'Because C'),
  ('c0000000-0000-0000-0000-000000000004', 'zz-q4', 'b0000000-0000-0000-0000-000000000002', 'Q4',
   '[{"key":"A","text_md":"a"},{"key":"B","text_md":"b"}]', 'A', 'Because A');
insert into public.tests (id, slug, title, kind, subject_id, duration_sec, marks_correct, marks_wrong, published_at) values
  ('d0000000-0000-0000-0000-000000000001', 'zz-mock-1', 'Mock 1', 'mock', 'a0000000-0000-0000-0000-000000000001', 600, 2, -0.66, now()),
  ('d0000000-0000-0000-0000-000000000002', 'zz-practice-only', 'Practice only', 'mock', 'a0000000-0000-0000-0000-000000000001', null, 1, 0, now());
insert into public.test_questions (test_id, question_id, position) values
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 1),
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 2),
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 3),
  ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 1);

create temp table ids (name text primary key, id uuid) on commit drop;
grant all on ids to authenticated;

set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

-- Timed: start + resume
insert into ids values ('timed', public.start_attempt('d0000000-0000-0000-0000-000000000001', 'timed'));
select is(public.start_attempt('d0000000-0000-0000-0000-000000000001', 'timed'), (select id from ids where name = 'timed'),
  'starting the same timed test again resumes the open attempt');
select ok(public.get_attempt((select id from ids where name = 'timed'))::text not like '%correct_key%',
  'a timed attempt never exposes correct_key before submission');
select ok(public.get_attempt((select id from ids where name = 'timed'))::text not like '%Because%',
  'a timed attempt never exposes explanations before submission');
select is(jsonb_array_length(public.get_attempt((select id from ids where name = 'timed'))->'questions'), 3,
  'get_attempt lists the test questions');
select ok(public.get_attempt((select id from ids where name = 'timed'))->'attempt'->>'deadline_at' is not null,
  'a timed attempt has a server deadline');
select is(public.save_answer((select id from ids where name = 'timed'), 'c0000000-0000-0000-0000-000000000001', 'B'), null,
  'a timed save returns nothing');
select lives_ok($$select public.save_answer((select id from ids where name = 'timed'), 'c0000000-0000-0000-0000-000000000002', 'B')$$,
  'a timed answer can be saved');
select lives_ok($$select public.save_answer((select id from ids where name = 'timed'), 'c0000000-0000-0000-0000-000000000003', null, true)$$,
  'a question can be marked for review without an answer');
select throws_ok($$select public.save_answer((select id from ids where name = 'timed'), 'c0000000-0000-0000-0000-000000000004', 'A')$$,
  'P0001', 'Question is not part of this test', 'answers to questions outside the test are rejected');
select throws_ok($$select public.save_answer((select id from ids where name = 'timed'), 'c0000000-0000-0000-0000-000000000001', 'Z')$$,
  'P0001', 'Not an option for this question', 'unknown option keys are rejected');

-- Scoring: 1 correct (+2), 1 wrong (-0.66), 1 skipped
select is(public.submit_attempt((select id from ids where name = 'timed')),
  '{"score": 1.34, "n_correct": 1, "n_wrong": 1, "n_skipped": 1}'::jsonb, 'submit scores with negative marking');
select is(public.submit_attempt((select id from ids where name = 'timed')),
  '{"score": 1.34, "n_correct": 1, "n_wrong": 1, "n_skipped": 1}'::jsonb, 'submitting twice changes nothing');
select throws_ok($$select public.save_answer((select id from ids where name = 'timed'), 'c0000000-0000-0000-0000-000000000003', 'C')$$,
  'P0001', 'This attempt has been submitted', 'answers after submission are rejected');
select is(public.get_attempt_review((select id from ids where name = 'timed'))->'questions'->0->>'explanation_md', 'Because B',
  'the review includes explanations after submission');

-- Deadline: expired timed attempts reject answers and get submitted on load
insert into ids values ('late', public.start_attempt('d0000000-0000-0000-0000-000000000001', 'timed'));
reset role;
update public.attempts set deadline_at = now() - interval '31 seconds' where id = (select id from ids where name = 'late');
set local role authenticated;
select throws_ok($$select public.save_answer((select id from ids where name = 'late'), 'c0000000-0000-0000-0000-000000000001', 'B')$$,
  'P0001', 'Time is up for this attempt', 'answers after the deadline and grace period are rejected');
select ok(public.get_attempt((select id from ids where name = 'late'))->'attempt'->>'submitted_at' is not null,
  'loading an expired attempt submits it');
insert into ids values ('late2', public.start_attempt('d0000000-0000-0000-0000-000000000001', 'timed'));
reset role;
update public.attempts set deadline_at = now() - interval '31 seconds' where id = (select id from ids where name = 'late2');
set local role authenticated;
select is(public.submit_expired_attempts(), 1, 'expired attempts are submitted in bulk for history pages');
select ok((select submitted_at from public.attempts where id = (select id from ids where name = 'late2')) is not null,
  'the bulk-submitted attempt has a submission time');

-- Practice
select throws_ok($$select public.start_attempt('d0000000-0000-0000-0000-000000000002', 'timed')$$,
  'P0001', 'This test can only be taken as practice', 'a test with no duration cannot be timed');
insert into ids values ('practice', public.start_attempt('d0000000-0000-0000-0000-000000000001', 'practice'));
select is(public.save_answer((select id from ids where name = 'practice'), 'c0000000-0000-0000-0000-000000000001', 'A'),
  '{"is_correct": false, "correct_key": "B", "explanation_md": "Because B"}'::jsonb,
  'practice reveals the answer and explanation after checking');
select throws_ok($$select public.save_answer((select id from ids where name = 'practice'), 'c0000000-0000-0000-0000-000000000001', 'B')$$,
  'P0001', 'This question has already been checked', 'a checked practice question is locked');
select is(public.get_attempt((select id from ids where name = 'practice'))->'questions'->0->'result'->>'correct_key', 'B',
  'get_attempt includes results for checked practice questions');
select throws_ok($$select public.get_attempt_review((select id from ids where name = 'practice'))$$,
  'P0001', 'Submit the attempt first', 'the review is unavailable before submission');

-- Ownership
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select throws_ok($$select public.get_attempt((select id from ids where name = 'practice'))$$,
  'P0001', 'Attempt not found', 'another user''s attempt is not reachable');
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

-- Custom tests
insert into ids values ('custom', public.create_custom_test(array['b0000000-0000-0000-0000-000000000001']::uuid[], 5));
select is((select count(*) from public.test_questions where test_id = (select id from ids where name = 'custom')), 3::bigint,
  'a custom test takes as many questions as exist, up to the count');
select is((select created_by from public.tests where id = (select id from ids where name = 'custom')),
  '11111111-1111-1111-1111-111111111111'::uuid, 'a custom test belongs to its creator');
select throws_ok($$select public.create_custom_test(array['b0000000-0000-0000-0000-000000000001']::uuid[], 4)$$,
  'P0001', 'Choose between 5 and 50 questions', 'custom tests need 5 to 50 questions');

select * from finish();
rollback;
