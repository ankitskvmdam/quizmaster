-- create_period_test, retired questions, and category labels in attempts (current affairs, Task 3).
begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

insert into public.allowed_emails (email) values ('pt@test.dev');
insert into auth.users (id, email) values ('51111111-1111-1111-1111-111111111111', 'pt@test.dev');

insert into public.subjects (id, slug, name) values ('a0000000-0000-0000-0000-0000000000d1', 'zz-pt-gs', 'PT subject');
insert into public.sections (id, subject_id, slug, name, kind) values
  ('e0000000-0000-0000-0000-0000000000d1', 'a0000000-0000-0000-0000-0000000000d1', 'current-affairs', 'Current Affairs', 'current_affairs');
insert into public.ca_categories (slug, name, position) values ('zz-appt', 'Appointments', 101), ('zz-sport', 'Sports', 102)
  on conflict (slug) do nothing;
insert into public.ca_months (id, section_id, month) values
  ('f0000000-0000-0000-0000-0000000000d1', 'e0000000-0000-0000-0000-0000000000d1', '1901-01-01'),
  ('f0000000-0000-0000-0000-0000000000d2', 'e0000000-0000-0000-0000-0000000000d1', '1901-02-01');

-- 1901-01: 6 appointments + 2 sports + 1 retired appointment; 1901-02: 3 appointments (months no content uses)
insert into public.questions (slug, ca_month_id, ca_category_slug, stem_md, options, correct_key, retired)
select 'zz-pt-' || m || '-' || c || '-' || i, mid, c, 'Q', '[{"key":"A","text_md":"a"},{"key":"B","text_md":"b"}]', 'A', r
  from (values
    ('01', 'f0000000-0000-0000-0000-0000000000d1'::uuid, 'zz-appt', 6, false),
    ('01', 'f0000000-0000-0000-0000-0000000000d1'::uuid, 'zz-sport', 2, false),
    ('01r', 'f0000000-0000-0000-0000-0000000000d1'::uuid, 'zz-appt', 1, true),
    ('02', 'f0000000-0000-0000-0000-0000000000d2'::uuid, 'zz-appt', 3, false)
  ) as v(m, mid, c, n, r), generate_series(1, v.n) as i;

-- A topic with one live and one retired question, for create_custom_test
insert into public.topics (id, subject_id, slug, name) values ('b0000000-0000-0000-0000-0000000000d1', 'a0000000-0000-0000-0000-0000000000d1', 'zz-pt-topic', 'PT topic');
insert into public.questions (slug, topic_id, stem_md, options, correct_key, retired) values
  ('zz-pt-t1', 'b0000000-0000-0000-0000-0000000000d1', 'Q', '[{"key":"A","text_md":"a"},{"key":"B","text_md":"b"}]', 'A', false),
  ('zz-pt-t2', 'b0000000-0000-0000-0000-0000000000d1', 'Q', '[{"key":"A","text_md":"a"},{"key":"B","text_md":"b"}]', 'A', true);

create temp table ids (name text primary key, id uuid) on commit drop;
grant all on ids to authenticated;

set local role anon;
select throws_ok($$select public.create_period_test('1901-01-01', '1901-02-01')$$, '42501', null, 'anonymous users cannot build tests');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub":"51111111-1111-1111-1111-111111111111","role":"authenticated"}';

insert into ids values ('all', public.create_period_test('1901-01-01', '1901-02-01', null, 50));
select is((select count(*) from public.test_questions where test_id = (select id from ids where name = 'all')), 11::bigint,
  'a period test draws from every month in range and skips retired questions');
select is((select title from public.tests where id = (select id from ids where name = 'all')), 'Current affairs: Jan–Feb 1901',
  'the title names the period');
select is((select (marks_correct, marks_wrong)::text from public.tests where id = (select id from ids where name = 'all')), '(1,-0.33)',
  'current affairs uses +1 / -0.33 marking');
select is((select duration_sec from public.tests where id = (select id from ids where name = 'all')), null,
  'without seconds per question it is practice only');

insert into ids values ('sport', public.create_period_test('1901-01-01', '1901-01-01', array['zz-sport'], 10, 60));
select is((select count(*) from public.test_questions where test_id = (select id from ids where name = 'sport')), 2::bigint,
  'a category with fewer questions than asked gives what exists');
select is((select title from public.tests where id = (select id from ids where name = 'sport')), 'Current affairs: January 1901 · Sports',
  'a single month and category title');
select is((select duration_sec from public.tests where id = (select id from ids where name = 'sport')), 120,
  'a timed test gets its seconds per question drawn');

select throws_ok($$select public.create_period_test('1901-02-01', '1901-01-01')$$, 'P0001', 'Choose a valid period', 'reversed periods are refused');
select throws_ok($$select public.create_period_test('1900-01-01', '1901-01-01')$$, 'P0001', 'Choose a period of 12 months or less', '13 months is too long');
select throws_ok($$select public.create_period_test('1901-01-01', '1901-02-01', null, 4)$$, 'P0001', 'Choose between 5 and 50 questions', 'counts below 5 are refused');
select throws_ok($$select public.create_period_test('1902-01-01', '1902-03-01')$$, 'P0001', 'There are no questions for this period yet', 'an empty period is refused');

insert into ids values ('custom', public.create_custom_test(array['b0000000-0000-0000-0000-0000000000d1']::uuid[], 5));
select is((select count(*) from public.test_questions where test_id = (select id from ids where name = 'custom')), 1::bigint,
  'topic custom tests skip retired questions too');

-- Labels and reviews
insert into ids values ('att', public.start_attempt((select id from ids where name = 'sport'), 'practice'));
select is(public.get_attempt((select id from ids where name = 'att'))->'questions'->0->>'topic_name', 'Sports · Jan 1901',
  'the runner labels current-affairs questions with category and month');
select public.submit_attempt((select id from ids where name = 'att'));
reset role;
update public.ca_months set published = false where id = 'f0000000-0000-0000-0000-0000000000d1';
set local role authenticated;
select is(jsonb_array_length(public.get_attempt_review((select id from ids where name = 'att'))->'questions'), 2,
  'a review still shows every question after its month is unpublished');

select * from finish();
rollback;
