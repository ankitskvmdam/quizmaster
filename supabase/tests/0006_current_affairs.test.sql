-- Sections, monthly current affairs and read progress (current affairs, Task 2).
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

insert into public.allowed_emails (email) values ('ca1@test.dev'), ('ca2@test.dev');
insert into auth.users (id, email) values
  ('41111111-1111-1111-1111-111111111111', 'ca1@test.dev'),
  ('42222222-2222-2222-2222-222222222222', 'ca2@test.dev');

insert into public.subjects (id, slug, name) values ('a0000000-0000-0000-0000-0000000000c1', 'zz-ca-gs', 'CA subject');
insert into public.sections (id, subject_id, slug, name, kind, position) values
  ('e0000000-0000-0000-0000-0000000000c1', 'a0000000-0000-0000-0000-0000000000c1', 'current-affairs', 'Current Affairs', 'current_affairs', 1);
insert into public.ca_categories (slug, name, position) values ('zz-appointments', 'Appointments', 1)
  on conflict (slug) do nothing;
insert into public.ca_months (id, section_id, month, published) values
  ('f0000000-0000-0000-0000-0000000000c1', 'e0000000-0000-0000-0000-0000000000c1', '2099-01-01', true),
  ('f0000000-0000-0000-0000-0000000000c2', 'e0000000-0000-0000-0000-0000000000c1', '2099-02-01', false);
insert into public.ca_notes (month_id, category_slug, slug, body_md) values
  ('f0000000-0000-0000-0000-0000000000c1', 'zz-appointments', 'n1', '**A** appointed'),
  ('f0000000-0000-0000-0000-0000000000c2', 'zz-appointments', 'n2', '**B** appointed');
insert into public.questions (slug, ca_month_id, ca_category_slug, stem_md, options, correct_key) values
  ('zz-ca-q1', 'f0000000-0000-0000-0000-0000000000c1', 'zz-appointments', 'Who?',
   '[{"key":"A","text_md":"A"},{"key":"B","text_md":"B"}]', 'A');
insert into public.ca_progress (user_id, month_id, category_slug)
  values ('42222222-2222-2222-2222-222222222222', 'f0000000-0000-0000-0000-0000000000c1', 'zz-appointments');

select throws_ok($$insert into public.ca_months (section_id, month) values ('e0000000-0000-0000-0000-0000000000c1', '2099-03-15')$$,
  '23514', null, 'a month must be stored as the first of the month');
select throws_ok($$insert into public.questions (slug, topic_id, ca_month_id, ca_category_slug, stem_md, options, correct_key)
  select 'zz-both', t.id, 'f0000000-0000-0000-0000-0000000000c1', 'zz-appointments', 'x', '[]', 'A' from public.topics t limit 1$$,
  '23514', null, 'a question belongs to a topic or a month, not both');
select throws_ok($$insert into public.questions (slug, stem_md, options, correct_key) values ('zz-neither', 'x', '[]', 'A')$$,
  '23514', null, 'a question belongs to a topic or a month');

set local role authenticated;
set local request.jwt.claims to '{"sub":"41111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is((select count(*) from public.sections where subject_id = 'a0000000-0000-0000-0000-0000000000c1'), 1::bigint,
  'sections of a visible subject are readable');
select is((select count(*) from public.ca_months where section_id = 'e0000000-0000-0000-0000-0000000000c1'), 1::bigint,
  'only published months are visible');
select is((select count(*) from public.ca_notes where month_id = 'f0000000-0000-0000-0000-0000000000c2'), 0::bigint,
  'notes of an unpublished month are hidden');
select is((select count(*) from public.ca_notes where month_id = 'f0000000-0000-0000-0000-0000000000c1'), 1::bigint,
  'notes of a published month are readable');
select throws_ok($$select correct_key from public.questions$$, '42501', null, 'answers stay hidden');
select lives_ok($$select id, ca_month_id, ca_category_slug, retired from public.questions$$,
  'the new question columns are readable');
select lives_ok($$insert into public.ca_progress (month_id, category_slug) values ('f0000000-0000-0000-0000-0000000000c1', 'zz-appointments')$$,
  'a person can mark a category read');
select is((select count(*) from public.ca_progress), 1::bigint, 'another person''s read ticks are hidden');
select throws_ok($$insert into public.ca_progress (user_id, month_id, category_slug)
  values ('42222222-2222-2222-2222-222222222222', 'f0000000-0000-0000-0000-0000000000c1', 'zz-appointments')$$,
  '42501', null, 'nobody can write another person''s read ticks');
select throws_ok($$insert into public.ca_notes (month_id, category_slug, slug, body_md)
  values ('f0000000-0000-0000-0000-0000000000c1', 'zz-appointments', 'x', 'x')$$,
  '42501', null, 'signed-in users cannot write notes');

select * from finish();
rollback;
