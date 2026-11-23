-- Global search over learning material: chapter titles and gists, notes (lessons), books and syllabus nodes, in English
-- and Hindi. Quiz questions are deliberately not searched (results would reveal answers).
-- SECURITY INVOKER: the caller's RLS applies, so hidden books, unpublished notes and unpublished courses never match.

create extension if not exists pg_trgm with schema extensions;

-- Search folds text before comparing, so common spelling variants match: case, chandrabindu (U+0901) vs anusvara
-- (U+0902), and letters with or without a nukta, whether precomposed (U+0958..U+095F) or with the combining nukta (U+093C).
create function public.search_fold(t text)
returns text
language sql
immutable
parallel safe
as $f$
  select lower(replace(
    translate(coalesce(t, ''),
      U&'\0901\0958\0959\095A\095B\095C\095D\095E\095F',
      U&'\0902\0915\0916\0917\091C\0921\0922\092B\092F'),
    U&'\093C', ''))
$f$;

-- Trigram indexes keep substring search fast as content grows; trigrams work for Devanagari too.
create index book_chapters_search_idx on public.book_chapters
  using gin (public.search_fold(title || ' ' || gist_md || ' ' || coalesce(title_hi, '') || ' ' || coalesce(gist_md_hi, '')) extensions.gin_trgm_ops);
create index lessons_search_idx on public.lessons
  using gin (public.search_fold(title || ' ' || body_md || ' ' || coalesce(title_hi, '') || ' ' || coalesce(body_md_hi, '')) extensions.gin_trgm_ops);

create function public.search_content(p_query text, p_limit int default 30)
returns table (
  kind text,          -- 'chapter' | 'lesson' | 'book' | 'node'
  course_slug text,
  node_path text,     -- chapter/book: the subject node; lesson: its node; node: itself
  book_slug text,
  item_slug text,     -- chapter or lesson slug
  number int,         -- chapter number
  title text,
  title_hi text,
  body text,
  body_hi text,
  rank int            -- 0 = the title matched, 1 = only the text did
)
language sql
stable
security invoker
set search_path = public
as $$
  with q as (
    -- The folded query as a LIKE pattern, with \ % _ taken literally.
    select '%' || replace(replace(replace(public.search_fold(trim(p_query)), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pat
     where char_length(trim(coalesce(p_query, ''))) >= 2
  ),
  hits as (
    select 'chapter'::text as kind, s.slug as course_slug, t.path as node_path, b.slug as book_slug, c.slug as item_slug,
           c.number, c.title, c.title_hi, c.gist_md as body, c.gist_md_hi as body_hi,
           case when public.search_fold(c.title || ' ' || coalesce(c.title_hi, '')) like q.pat then 0 else 1 end as rank
      from q, public.book_chapters c
      join public.books b on b.id = c.book_id
      join public.topics t on t.id = b.topic_id
      join public.subjects s on s.id = t.subject_id
     where public.search_fold(c.title || ' ' || c.gist_md || ' ' || coalesce(c.title_hi, '') || ' ' || coalesce(c.gist_md_hi, '')) like q.pat
    union all
    select 'lesson', s.slug, t.path, null, l.slug, null, l.title, l.title_hi, l.body_md, l.body_md_hi,
           case when public.search_fold(l.title || ' ' || coalesce(l.title_hi, '')) like q.pat then 0 else 1 end
      from q, public.lessons l
      join public.topics t on t.id = l.topic_id
      join public.subjects s on s.id = t.subject_id
     where public.search_fold(l.title || ' ' || l.body_md || ' ' || coalesce(l.title_hi, '') || ' ' || coalesce(l.body_md_hi, '')) like q.pat
    union all
    select 'book', s.slug, t.path, b.slug, null, null, b.title, b.title_hi, b.description, b.description_hi,
           case when public.search_fold(b.title || ' ' || coalesce(b.title_hi, '')) like q.pat then 0 else 1 end
      from q, public.books b
      join public.topics t on t.id = b.topic_id
      join public.subjects s on s.id = t.subject_id
     where public.search_fold(b.title || ' ' || b.description || ' ' || coalesce(b.title_hi, '') || ' ' || coalesce(b.description_hi, '')) like q.pat
    union all
    select 'node', s.slug, t.path, null, null, null, t.name, t.name_hi, t.description, t.description_hi,
           case when public.search_fold(t.name || ' ' || coalesce(t.name_hi, '')) like q.pat then 0 else 1 end
      from q, public.topics t
      join public.subjects s on s.id = t.subject_id
     where public.search_fold(t.name || ' ' || t.description || ' ' || coalesce(t.name_hi, '') || ' ' || coalesce(t.description_hi, '')) like q.pat
  )
  select * from hits
   order by rank, case kind when 'chapter' then 0 when 'lesson' then 1 when 'book' then 2 else 3 end, number nulls last, title
   limit greatest(1, least(coalesce(p_limit, 30), 100));
$$;

revoke execute on function public.search_content(text, int) from public, anon;
grant execute on function public.search_content(text, int) to authenticated, service_role;
