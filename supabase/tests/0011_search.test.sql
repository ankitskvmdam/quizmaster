-- Global search over chapters (title + gist), notes, books and syllabus nodes, in English and Hindi.
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

insert into public.allowed_emails (email) values ('search1@test.dev');
insert into auth.users (id, email) values ('91111111-1111-1111-1111-111111111111', 'search1@test.dev');

insert into public.subjects (id, slug, name) values ('a0000000-0000-0000-0000-0000000000a9', 'zz-search', 'Search course');
insert into public.topics (id, subject_id, slug, path, name, name_hi, description) values
  ('b0000000-0000-0000-0000-0000000000a9', 'a0000000-0000-0000-0000-0000000000a9', 'history', 'history', 'History', 'इतिहास', 'All of history'),
  ('b0000000-0000-0000-0000-0000000000b9', 'a0000000-0000-0000-0000-0000000000a9', 'zzmodern', 'history/zzmodern', 'Zzmodern', null, 'Zebrafinch era');
insert into public.lessons (topic_id, slug, title, body_md, title_hi, body_md_hi, published) values
  ('b0000000-0000-0000-0000-0000000000b9', 'zz-lota', 'Zzlota protest', 'Prisoners at Zzmuzaffar jail protested, unlike under the Zzmauryas.', 'ज़ज़लोटा विरोध', 'ज़ज़मुज़फ़्फ़र जेल के कैदी।', true),
  ('b0000000-0000-0000-0000-0000000000b9', 'zz-draft', 'Draft note', 'Zzhidden draft text.', null, null, false);
insert into public.books (id, topic_id, slug, title, published) values
  ('c1000000-0000-0000-0000-0000000000a9', 'b0000000-0000-0000-0000-0000000000a9', 'zz-book', 'Zzbook of history', true),
  ('c1000000-0000-0000-0000-0000000000b9', 'b0000000-0000-0000-0000-0000000000a9', 'zz-hidden', 'Hidden book', false);
insert into public.book_chapters (id, book_id, slug, number, title, gist_md, title_hi, gist_md_hi) values
  ('c2000000-0000-0000-0000-0000000000a9', 'c1000000-0000-0000-0000-0000000000a9', 'zz-kalinga', 1, 'The Zzmauryas',
   '## Gist\nAfter the Zzkalinga war, 100% change.\n\n## Key facts\n- **x**', 'ज़ज़मौर्य', '## Gist\nज़ज़कलिंग युद्ध के बाद ज़ज़कुँवर आए।\n\n## Key facts\n- **x**'),
  ('c2000000-0000-0000-0000-0000000000b9', 'c1000000-0000-0000-0000-0000000000b9', 'zz-secret', 1, 'Secret', '## Gist\nZzkalinga secret.\n\n## Key facts\n- **x**', null, null);
insert into public.questions (slug, topic_id, stem_md, options, correct_key, explanation_md) values
  ('zz-search-q', 'b0000000-0000-0000-0000-0000000000b9', 'Zzquestiononly?', '[{"key":"A","text_md":"a"},{"key":"B","text_md":"b"}]', 'A', 'x');

set local role anon;
select throws_ok($$select * from public.search_content('zzkalinga')$$, '42501', null, 'anon cannot search');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub":"91111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is((select string_agg(kind || ':' || item_slug, ',') from public.search_content('zzkalinga')), 'chapter:zz-kalinga',
  'finds a chapter by a word in its gist, case-insensitively, and never a chapter of a hidden book');
select is((select book_slug || '/' || node_path from public.search_content('zzkalinga')), 'zz-book/history',
  'a chapter result carries its book and subject path for the link');
select is((select item_slug from public.search_content('ज़ज़कलिंग')), 'zz-kalinga', 'finds a chapter by its Hindi gist');
select is((select kind || ':' || item_slug from public.search_content('zzlota')), 'lesson:zz-lota', 'finds a note by its title');
select is((select count(*) from public.search_content('zzhidden')), 0::bigint, 'unpublished notes are not found');
select is((select count(*) from public.search_content('zzquestiononly')), 0::bigint, 'quiz questions are never searched');
select is((select kind || ':' || node_path from public.search_content('zebrafinch')), 'node:history/zzmodern', 'finds a section by its description');
select is((select count(*) from public.search_content('100%')), 1::bigint, '% in a query is a literal character, not a wildcard');
select is((select count(*) from public.search_content('z')), 0::bigint, 'a one-character query returns nothing');
select is((select string_agg(kind, ',' order by rank, kind) from public.search_content('zzmauryas')), 'chapter,lesson',
  'a title match (the chapter) ranks before a body match (the note)');

select is((select item_slug from public.search_content('ज़ज़कुंवर')), 'zz-kalinga', 'anusvara and chandrabindu spellings match each other');
select is((select item_slug from public.search_content('जजकलिंग')), 'zz-kalinga', 'a letter without its nukta matches the letter with it');

select * from finish();
rollback;
