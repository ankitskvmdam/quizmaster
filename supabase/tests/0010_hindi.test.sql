-- Hindi content beside English, and each person's content language (Hindi by default).
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

insert into public.allowed_emails (email) values ('hindi1@test.dev'), ('hindi2@test.dev');
insert into auth.users (id, email) values
  ('81111111-1111-1111-1111-111111111111', 'hindi1@test.dev'),
  ('82222222-2222-2222-2222-222222222222', 'hindi2@test.dev');

insert into public.subjects (id, slug, name, name_hi) values ('a0000000-0000-0000-0000-0000000000f1', 'zz-hi', 'Hindi course', 'हिन्दी पाठ्यक्रम');
insert into public.topics (id, subject_id, slug, path, name, name_hi, description_hi) values
  ('b0000000-0000-0000-0000-0000000000f1', 'a0000000-0000-0000-0000-0000000000f1', 'history', 'history', 'History', 'इतिहास', 'आधुनिक इतिहास');
insert into public.lessons (topic_id, slug, title, body_md, title_hi, body_md_hi) values
  ('b0000000-0000-0000-0000-0000000000f1', 'zz-hi-lesson', 'A note', 'Body', 'एक नोट', 'मुख्य भाग');
insert into public.books (id, topic_id, slug, title, title_hi, description_hi, published) values
  ('c1000000-0000-0000-0000-0000000000f1', 'b0000000-0000-0000-0000-0000000000f1', 'hi-book', 'Book', 'पुस्तक', 'विवरण', true);
insert into public.book_chapters (id, book_id, slug, number, title, gist_md, title_hi, gist_md_hi) values
  ('c2000000-0000-0000-0000-0000000000f1', 'c1000000-0000-0000-0000-0000000000f1', 'ch', 1, 'Chapter', 'g', 'अध्याय', 'सार');
insert into public.questions (id, slug, topic_id, stem_md, options, correct_key, explanation_md, stem_md_hi, options_hi, explanation_md_hi) values
  ('c3000000-0000-0000-0000-0000000000f1', 'zz-hi-q1', 'b0000000-0000-0000-0000-0000000000f1', 'Who?',
   '[{"key":"A","text_md":"Ashoka"},{"key":"B","text_md":"Akbar"}]', 'A', 'Because.',
   'कौन?', '[{"key":"A","text_md":"अशोक"},{"key":"B","text_md":"अकबर"}]', 'क्योंकि।');
insert into public.tests (id, slug, title, title_hi, kind, subject_id, duration_sec, marks_correct, marks_wrong, published_at) values
  ('c4000000-0000-0000-0000-0000000000f1', 'zz-hi-test', 'Quiz', 'प्रश्नोत्तरी', 'mock', 'a0000000-0000-0000-0000-0000000000f1', 600, 1, 0, now());
insert into public.test_questions (test_id, question_id, position) values
  ('c4000000-0000-0000-0000-0000000000f1', 'c3000000-0000-0000-0000-0000000000f1', 1);

select is((select content_lang from public.profiles where id = '81111111-1111-1111-1111-111111111111'), 'hi',
  'a new account reads content in Hindi');
select throws_ok($$update public.profiles set content_lang = 'fr' where id = '81111111-1111-1111-1111-111111111111'$$,
  '23514', null, 'the content language is hi or en');
select ok(has_column_privilege('service_role', 'public.questions', 'explanation_md_hi', 'update'),
  'the CLIs can write Hindi explanations');

create temp table ids (name text primary key, id uuid) on commit drop;
grant all on ids to authenticated;

set local role authenticated;
set local request.jwt.claims to '{"sub":"81111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is((select title_hi from public.book_chapters where id = 'c2000000-0000-0000-0000-0000000000f1'), 'अध्याय',
  'Hindi chapter text is readable');
select lives_ok($$select stem_md_hi, options_hi from public.questions$$, 'Hindi stems and options are readable');
select throws_ok($$select explanation_md_hi from public.questions$$, '42501', null,
  'Hindi explanations stay hidden like English ones');

update public.profiles set content_lang = 'en' where id = '81111111-1111-1111-1111-111111111111';
update public.profiles set content_lang = 'en' where id = '82222222-2222-2222-2222-222222222222';
select is((select content_lang from public.profiles where id = '81111111-1111-1111-1111-111111111111'), 'en',
  'a person can switch to English');
reset role;
select is((select content_lang from public.profiles where id = '82222222-2222-2222-2222-222222222222'), 'hi',
  'nobody can change someone else''s language');
set local role authenticated;
set local request.jwt.claims to '{"sub":"81111111-1111-1111-1111-111111111111","role":"authenticated"}';

insert into ids values ('timed', public.start_attempt('c4000000-0000-0000-0000-0000000000f1', 'timed'));
select is(public.get_attempt((select id from ids where name = 'timed'))->'questions'->0->>'stem_md_hi', 'कौन?',
  'a running attempt carries the Hindi stem');
select is(public.get_attempt((select id from ids where name = 'timed'))->'test'->>'title_hi', 'प्रश्नोत्तरी',
  'and the Hindi test title');
select ok(public.get_attempt((select id from ids where name = 'timed'))->'questions'->0->'explanation_md_hi' is null,
  'a timed attempt never carries the Hindi explanation');

insert into ids values ('prac', public.start_attempt('c4000000-0000-0000-0000-0000000000f1', 'practice'));
select is(public.save_answer((select id from ids where name = 'prac'), 'c3000000-0000-0000-0000-0000000000f1', 'A')->>'explanation_md_hi',
  'क्योंकि।', 'checking a practice answer returns the Hindi explanation too');

select public.submit_attempt((select id from ids where name = 'timed'));
select is(public.get_attempt_review((select id from ids where name = 'timed'))->'questions'->0->>'explanation_md_hi', 'क्योंकि।',
  'the review shows the Hindi explanation');

select * from finish();
rollback;
