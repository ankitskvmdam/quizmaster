-- Syllabus tree (topics with parents and paths) and books with chapter gists (courses plan, step 1).
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into public.allowed_emails (email) values ('tree1@test.dev'), ('tree2@test.dev');
insert into auth.users (id, email) values
  ('71111111-1111-1111-1111-111111111111', 'tree1@test.dev'),
  ('72222222-2222-2222-2222-222222222222', 'tree2@test.dev');

insert into public.subjects (id, slug, name) values ('a0000000-0000-0000-0000-0000000000e1', 'zz-tree', 'Tree course');
insert into public.topics (id, subject_id, parent_id, slug, path, name, position) values
  ('b0000000-0000-0000-0000-0000000000e1', 'a0000000-0000-0000-0000-0000000000e1', null, 'history', 'history', 'History', 1),
  ('b0000000-0000-0000-0000-0000000000e2', 'a0000000-0000-0000-0000-0000000000e1', 'b0000000-0000-0000-0000-0000000000e1', 'ancient', 'history/ancient', 'Ancient', 1),
  ('b0000000-0000-0000-0000-0000000000e3', 'a0000000-0000-0000-0000-0000000000e1', 'b0000000-0000-0000-0000-0000000000e2', 'india', 'history/ancient/india', 'India', 1),
  ('b0000000-0000-0000-0000-0000000000e4', 'a0000000-0000-0000-0000-0000000000e1', 'b0000000-0000-0000-0000-0000000000e2', 'world', 'history/ancient/world', 'World', 2),
  ('b0000000-0000-0000-0000-0000000000e5', 'a0000000-0000-0000-0000-0000000000e1', 'b0000000-0000-0000-0000-0000000000e1', 'medieval', 'history/medieval', 'Medieval', 2),
  ('b0000000-0000-0000-0000-0000000000e6', 'a0000000-0000-0000-0000-0000000000e1', 'b0000000-0000-0000-0000-0000000000e5', 'india', 'history/medieval/india', 'India', 1);

insert into public.questions (slug, topic_id, stem_md, options, correct_key, explanation_md)
select 'zz-tree-' || t || '-' || i, tid, 'Q', '[{"key":"A","text_md":"a"},{"key":"B","text_md":"b"}]', 'A', 'x'
  from (values ('india', 'b0000000-0000-0000-0000-0000000000e3'::uuid, 2),
               ('world', 'b0000000-0000-0000-0000-0000000000e4'::uuid, 1),
               ('medieval-india', 'b0000000-0000-0000-0000-0000000000e6'::uuid, 1)) as v(t, tid, n),
       generate_series(1, v.n) as i;

insert into public.books (id, topic_id, slug, title, author, published) values
  ('c1000000-0000-0000-0000-0000000000e1', 'b0000000-0000-0000-0000-0000000000e1', 'ancient-india', 'Ancient India', 'A. Author', true),
  ('c1000000-0000-0000-0000-0000000000e2', 'b0000000-0000-0000-0000-0000000000e1', 'draft-book', 'Draft book', 'B. Author', false);
insert into public.book_chapters (id, book_id, slug, number, title, gist_md) values
  ('c2000000-0000-0000-0000-0000000000e1', 'c1000000-0000-0000-0000-0000000000e1', 'mauryas', 1, 'The Mauryas', '## Gist\nx\n\n## Key facts\n- **y**'),
  ('c2000000-0000-0000-0000-0000000000e2', 'c1000000-0000-0000-0000-0000000000e2', 'draft-ch', 1, 'Draft chapter', '## Gist\nx\n\n## Key facts\n- **y**');
insert into public.chapter_topics (chapter_id, topic_id) values
  ('c2000000-0000-0000-0000-0000000000e1', 'b0000000-0000-0000-0000-0000000000e3');
insert into public.questions (id, slug, chapter_id, stem_md, options, correct_key, explanation_md) values
  ('c3000000-0000-0000-0000-0000000000e1', 'zz-tree-ch-1', 'c2000000-0000-0000-0000-0000000000e1', 'Who founded the Maurya empire?',
   '[{"key":"A","text_md":"Chandragupta"},{"key":"B","text_md":"Ashoka"}]', 'A', 'Chandragupta Maurya.');
insert into public.tests (id, slug, title, kind, subject_id, chapter_id, marks_correct, marks_wrong, published_at) values
  ('c4000000-0000-0000-0000-0000000000e1', 'book-zz-mauryas', 'The Mauryas quiz', 'chapter', 'a0000000-0000-0000-0000-0000000000e1',
   'c2000000-0000-0000-0000-0000000000e1', 1, 0, now());
insert into public.test_questions (test_id, question_id, position) values
  ('c4000000-0000-0000-0000-0000000000e1', 'c3000000-0000-0000-0000-0000000000e1', 1);

-- Structure
select is((select count(*) from public.topic_subtree('b0000000-0000-0000-0000-0000000000e2')), 3::bigint,
  'a subtree is the node and every descendant');
select throws_ok($$insert into public.topics (subject_id, slug, path, name) values ('a0000000-0000-0000-0000-0000000000e1', 'x', 'history/ancient', 'Dup')$$,
  '23505', null, 'a path is unique within a course');
select is((select count(*) from public.topics where subject_id = 'a0000000-0000-0000-0000-0000000000e1' and slug = 'india'), 2::bigint,
  'the same slug can repeat under different parents');
select throws_ok($$insert into public.questions (slug, topic_id, chapter_id, stem_md, options, correct_key)
  values ('zz-both2', 'b0000000-0000-0000-0000-0000000000e3', 'c2000000-0000-0000-0000-0000000000e1', 'x', '[]', 'A')$$,
  '23514', null, 'a question belongs to exactly one of topic, month or chapter');
select ok(has_table_privilege('service_role', 'public.books', 'select, insert, update, delete')
          and has_table_privilege('service_role', 'public.book_chapters', 'select, insert, update, delete'),
  'the CLIs can write books and chapters');

create temp table ids (name text primary key, id uuid) on commit drop;
grant all on ids to authenticated;

set local role anon;
select throws_ok($$select count(*) from public.books$$, '42501', null, 'anon cannot read books');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub":"71111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is((select count(*) from public.books where topic_id = 'b0000000-0000-0000-0000-0000000000e1'), 1::bigint,
  'unpublished books are hidden');
select is((select count(*) from public.book_chapters where book_id = 'c1000000-0000-0000-0000-0000000000e2'), 0::bigint,
  'chapters of an unpublished book are hidden');
select is((select count(*) from public.chapter_topics where chapter_id in ('c2000000-0000-0000-0000-0000000000e1', 'c2000000-0000-0000-0000-0000000000e2')), 1::bigint, 'chapter tags of visible books are readable');
select throws_ok($$select correct_key from public.questions where chapter_id is not null$$, '42501', null,
  'chapter quiz answers stay hidden');
select lives_ok($$select id, chapter_id from public.questions$$, 'the chapter link is readable');

insert into ids values ('anc', public.create_custom_test(array['b0000000-0000-0000-0000-0000000000e2']::uuid[], 50));
select is((select count(*) from public.test_questions where test_id = (select id from ids where name = 'anc')), 4::bigint,
  'practising a node draws from its whole subtree plus chapters tagged inside it');
select is((select title from public.tests where id = (select id from ids where name = 'anc')), 'Practice: Ancient',
  'a practice set is named after its nodes');

insert into ids values ('att', public.start_attempt('c4000000-0000-0000-0000-0000000000e1', 'practice'));
select is(public.get_attempt((select id from ids where name = 'att'))->'questions'->0->>'topic_name', 'The Mauryas · Ancient India',
  'chapter questions are labelled with chapter and book');

select lives_ok($$insert into public.chapter_progress (chapter_id) values ('c2000000-0000-0000-0000-0000000000e1')$$,
  'a person can mark a chapter read');
select throws_ok($$insert into public.chapter_progress (user_id, chapter_id)
  values ('72222222-2222-2222-2222-222222222222', 'c2000000-0000-0000-0000-0000000000e1')$$,
  '42501', null, 'nobody can mark chapters for someone else');

select * from finish();
rollback;
