-- The step-by-step test builder: up to 10 sections, each a set of chapters (book chapters, topic sections, months'
-- sections). The total is split as evenly as the sections allow: a section with fewer questions than its share gives
-- the rest to the others. Questions are grouped by section, in random order inside each. A question picked in an
-- earlier section is not repeated in a later one.
create function public.create_built_test(
  p_sections jsonb,          -- [{"chapter_ids": ["uuid", …]}, …]
  p_count int,
  p_duration_sec int default null,
  p_title text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  n_sections int;
  remaining int;
  n_open int;
  share int;
  give int;
  rec record;
  new_id uuid;
  first_subject uuid;
  auto_title text;
begin
  if auth.uid() is null then
    raise exception 'Sign in to create a test' using errcode = 'P0001';
  end if;
  if p_count is null or p_count < 5 or p_count > 150 then
    raise exception 'Choose between 5 and 150 questions' using errcode = 'P0001';
  end if;
  if p_duration_sec is not null and p_duration_sec <= 0 then
    raise exception 'The time limit must be positive' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_sections) is distinct from 'array' then
    raise exception 'Add at least one section' using errcode = 'P0001';
  end if;
  n_sections := jsonb_array_length(p_sections);
  if n_sections < 1 or n_sections > 10 then
    raise exception 'A test has 1 to 10 sections' using errcode = 'P0001';
  end if;

  create temporary table sec_chapters on commit drop as
    select s.ord::int as sec, c.id::uuid as chapter_id
      from jsonb_array_elements(p_sections) with ordinality as s(val, ord),
           jsonb_array_elements_text(s.val -> 'chapter_ids') as c(id);
  if (select count(distinct sec) from sec_chapters) < n_sections then
    drop table sec_chapters;
    raise exception 'Pick at least one topic in every section' using errcode = 'P0001';
  end if;

  -- Each live question once, in the first section that asked for it; only chapters of published books.
  create temporary table sec_pool on commit drop as
    select distinct on (q.id) sc.sec, q.id as qid, random() as r
      from sec_chapters sc
      join public.book_chapters ch on ch.id = sc.chapter_id
      join public.books b on b.id = ch.book_id and b.published
      join public.questions q on q.chapter_id = ch.id and not q.retired
     order by q.id, sc.sec;

  create temporary table alloc on commit drop as
    select g.sec, coalesce(p.avail, 0) as avail, 0 as take
      from generate_series(1, n_sections) as g(sec)
      left join (select sec, count(*)::int as avail from sec_pool group by sec) p on p.sec = g.sec;
  if (select sum(avail) from alloc) = 0 then
    drop table sec_chapters; drop table sec_pool; drop table alloc;
    raise exception 'There are no questions in these topics yet' using errcode = 'P0001';
  end if;

  -- Even split, capped by what each section has; repeat until the count is met or every section is used up.
  remaining := p_count;
  loop
    select count(*) into n_open from alloc where take < avail;
    exit when remaining = 0 or n_open = 0;
    share := greatest(remaining / n_open, 1);
    for rec in select sec, avail, take from alloc where take < avail order by sec loop
      give := least(share, rec.avail - rec.take, remaining);
      update alloc set take = take + give where sec = rec.sec;
      remaining := remaining - give;
      exit when remaining = 0;
    end loop;
  end loop;

  select t.subject_id into first_subject
    from sec_chapters sc
    join public.book_chapters ch on ch.id = sc.chapter_id
    join public.books b on b.id = ch.book_id
    join public.topics t on t.id = b.topic_id
   order by sc.sec
   limit 1;
  select string_agg(distinct b.title, ', ') into auto_title
    from sec_chapters sc
    join public.book_chapters ch on ch.id = sc.chapter_id
    join public.books b on b.id = ch.book_id;

  insert into public.tests (title, kind, subject_id, created_by, duration_sec, marks_correct, marks_wrong, published, published_at)
  values (left(coalesce(nullif(btrim(p_title), ''), 'My test: ' || auto_title), 200), 'custom', first_subject, auth.uid(),
          p_duration_sec, 1, 0, true, now())
  returning id into new_id;

  insert into public.test_questions (test_id, question_id, position)
  select new_id, x.qid, row_number() over (order by x.sec, x.rn)
    from (
      select p.sec, p.qid, row_number() over (partition by p.sec order by p.r) as rn
        from sec_pool p
    ) x
    join alloc a on a.sec = x.sec
   where x.rn <= a.take;

  drop table sec_chapters; drop table sec_pool; drop table alloc;
  return new_id;
end;
$$;

revoke execute on function public.create_built_test(jsonb, int, int, text) from public, anon, authenticated;
grant execute on function public.create_built_test(jsonb, int, int, text) to authenticated, service_role;
