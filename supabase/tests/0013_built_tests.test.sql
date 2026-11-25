-- The step-by-step test builder: sections of chapters, an even split, no repeats, grouped by section.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into public.allowed_emails (email) values ('built1@test.dev');
insert into auth.users (id, email) values ('73333333-3333-3333-3333-333333333333', 'built1@test.dev');
set local role authenticated;
set local request.jwt.claims to '{"sub":"73333333-3333-3333-3333-333333333333","role":"authenticated"}';
reset role;

insert into public.subjects (id, slug, name) values ('a0000000-0000-0000-0000-0000000000f1', 'zz-built', 'Built course');
insert into public.topics (id, subject_id, slug, path, name, position) values
  ('b0000000-0000-0000-0000-0000000000f1', 'a0000000-0000-0000-0000-0000000000f1', 'subj', 'subj', 'Subject', 1);
insert into public.books (id, topic_id, slug, title, published) values
  ('c1000000-0000-0000-0000-0000000000f1', 'b0000000-0000-0000-0000-0000000000f1', 'book-a', 'Book A', true),
  ('c1000000-0000-0000-0000-0000000000f2', 'b0000000-0000-0000-0000-0000000000f1', 'book-b', 'Book B', true);
insert into public.book_chapters (id, book_id, slug, number, title, gist_md) values
  ('c2000000-0000-0000-0000-0000000000f1', 'c1000000-0000-0000-0000-0000000000f1', 'big', 1, 'Big', 'x'),
  ('c2000000-0000-0000-0000-0000000000f2', 'c1000000-0000-0000-0000-0000000000f2', 'small', 1, 'Small', 'x');
-- 20 questions in "Big", 3 in "Small"
insert into public.questions (slug, chapter_id, stem_md, options, correct_key, explanation_md)
select 'zz-built-' || c || '-' || i, ch, 'Q', '[{"key":"A","text_md":"a"},{"key":"B","text_md":"b"}]', 'A', 'x'
  from (values ('big', 'c2000000-0000-0000-0000-0000000000f1'::uuid, 20), ('small', 'c2000000-0000-0000-0000-0000000000f2'::uuid, 3)) as v(c, ch, n),
       generate_series(1, v.n) as i;

create temporary table ids (name text primary key, id uuid);
grant all on ids to authenticated;
set local role authenticated;

insert into ids values ('even', public.create_built_test(
  '[{"chapter_ids":["c2000000-0000-0000-0000-0000000000f1"]},{"chapter_ids":["c2000000-0000-0000-0000-0000000000f2"]}]', 6));
select is((select count(*) from public.test_questions tq join public.questions q on q.id = tq.question_id
            where tq.test_id = (select id from ids where name = 'even') and q.chapter_id = 'c2000000-0000-0000-0000-0000000000f2'),
          3::bigint, 'two sections share six questions equally');

insert into ids values ('capped', public.create_built_test(
  '[{"chapter_ids":["c2000000-0000-0000-0000-0000000000f1"]},{"chapter_ids":["c2000000-0000-0000-0000-0000000000f2"]}]', 10, 600, 'My mix'));
select is((select count(*) from public.test_questions where test_id = (select id from ids where name = 'capped')), 10::bigint,
  'a small section gives its unused share to the others');
select is((select count(*) from public.test_questions tq join public.questions q on q.id = tq.question_id
            where tq.test_id = (select id from ids where name = 'capped') and q.chapter_id = 'c2000000-0000-0000-0000-0000000000f2'),
          3::bigint, 'the small section gives all it has');
select is((select max(tq.position) from public.test_questions tq join public.questions q on q.id = tq.question_id
            where tq.test_id = (select id from ids where name = 'capped') and q.chapter_id = 'c2000000-0000-0000-0000-0000000000f1'),
          7, 'questions are grouped by section, in section order');
select is((select title || '|' || duration_sec || '|' || (created_by = '73333333-3333-3333-3333-333333333333')::text
             from public.tests where id = (select id from ids where name = 'capped')),
          'My mix|600|true', 'the test keeps its name, time limit and owner');

insert into ids values ('dup', public.create_built_test(
  '[{"chapter_ids":["c2000000-0000-0000-0000-0000000000f2"]},{"chapter_ids":["c2000000-0000-0000-0000-0000000000f2"]}]', 10));
select is((select count(*) from public.test_questions where test_id = (select id from ids where name = 'dup')), 3::bigint,
  'a question picked in one section is not repeated in another');
select is((select title from public.tests where id = (select id from ids where name = 'dup')), 'My test: Book B',
  'an unnamed test is named after its books');

select throws_ok($$select public.create_built_test('[{"chapter_ids":[]}]', 10)$$, 'P0001', 'Pick at least one topic in every section',
  'every section needs a topic');
select throws_ok($$select public.create_built_test('[{"chapter_ids":["c2000000-0000-0000-0000-0000000000f1"]}]', 151)$$, 'P0001',
  'Choose between 5 and 150 questions', 'the count is limited');

select * from finish();
rollback;
