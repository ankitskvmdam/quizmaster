-- The test builder can pick single chapters (a book chapter, a topic section, a month's section) as well as syllabus
-- nodes. create_custom_test gains p_chapter_ids; a call with topic ids only behaves as before.
drop function public.create_custom_test(uuid[], int, int);

create function public.create_custom_test(
  p_topic_ids uuid[],
  p_count int,
  p_duration_sec int default null,
  p_chapter_ids uuid[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  picked_names text;
  first_subject uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in to create a test' using errcode = 'P0001';
  end if;
  if p_count is null or p_count < 5 or p_count > 50 then
    raise exception 'Choose between 5 and 50 questions' using errcode = 'P0001';
  end if;
  p_topic_ids := coalesce(p_topic_ids, '{}');
  p_chapter_ids := coalesce(p_chapter_ids, '{}');
  if cardinality(p_topic_ids) + cardinality(p_chapter_ids) = 0 then
    raise exception 'Pick at least one topic' using errcode = 'P0001';
  end if;
  if p_duration_sec is not null and p_duration_sec <= 0 then
    raise exception 'The time limit must be positive' using errcode = 'P0001';
  end if;

  -- Names for the title, and the course the test belongs to: nodes first, then chapters (only of published books).
  with picked as (
    select t.name, t.position as pos, 0 as grp, t.subject_id
      from public.topics t where t.id = any (p_topic_ids)
    union all
    select ch.title, ch.number, 1, t.subject_id
      from public.book_chapters ch
      join public.books b on b.id = ch.book_id and b.published
      join public.topics t on t.id = b.topic_id
     where ch.id = any (p_chapter_ids)
  )
  select string_agg(name, ', ' order by grp, pos, name), (array_agg(subject_id order by grp, pos))[1]
    into picked_names, first_subject
    from picked;
  if picked_names is null then
    raise exception 'Topic not found' using errcode = 'P0001';
  end if;

  create temporary table pool on commit drop as
    with nodes as (
      select distinct s.id from unnest(p_topic_ids) as t(id), lateral public.topic_subtree(t.id) as s(id)
    ),
    chapters as (
      select ct.chapter_id as id
        from public.chapter_topics ct
       where ct.topic_id in (select id from nodes)
      union
      select id from unnest(p_chapter_ids) as c(id)
    )
    select q.id, random() as r
      from public.questions q
     where not q.retired
       and (q.topic_id in (select id from nodes)
            or q.chapter_id in (
              select c.id
                from chapters c
                join public.book_chapters ch on ch.id = c.id
                join public.books b on b.id = ch.book_id and b.published));
  if not exists (select 1 from pool) then
    drop table pool;
    raise exception 'There are no questions in these topics yet' using errcode = 'P0001';
  end if;

  insert into public.tests (title, kind, subject_id, created_by, duration_sec, marks_correct, marks_wrong, published, published_at)
  values (left('Practice: ' || picked_names, 300), 'custom', first_subject, auth.uid(), p_duration_sec, 1, 0, true, now())
  returning id into new_id;

  insert into public.test_questions (test_id, question_id, position)
  select new_id, id, row_number() over (order by r) from (select id, r from pool order by r limit p_count) s;
  drop table pool;
  return new_id;
end;
$$;

revoke execute on function public.create_custom_test(uuid[], int, int, uuid[]) from public, anon, authenticated;
grant execute on function public.create_custom_test(uuid[], int, int, uuid[]) to authenticated, service_role;
