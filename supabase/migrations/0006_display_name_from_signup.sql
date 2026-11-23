-- The profile takes the name given at sign-up (user metadata display_name), tidied;
-- without one, the part of the email before the @.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  given text := nullif(regexp_replace(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '\s+', ' ', 'g'), '');
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(left(given, 60), split_part(new.email, '@', 1)));
  return new;
end;
$$;
