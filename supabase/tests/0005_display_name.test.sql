-- The profile takes the name given at sign-up (Task: display name).
begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

insert into public.allowed_emails (email) values ('named@test.dev'), ('unnamed@test.dev'), ('blank@test.dev');
insert into auth.users (id, email, raw_user_meta_data) values
  ('31111111-1111-1111-1111-111111111111', 'named@test.dev', '{"display_name": "  Asha   Verma "}'),
  ('32222222-2222-2222-2222-222222222222', 'unnamed@test.dev', '{}'),
  ('33333333-3333-3333-3333-333333333333', 'blank@test.dev', '{"display_name": "   "}');

select is((select display_name from public.profiles where id = '31111111-1111-1111-1111-111111111111'), 'Asha Verma',
  'the sign-up name becomes the display name, tidied');
select is((select display_name from public.profiles where id = '32222222-2222-2222-2222-222222222222'), 'unnamed',
  'without a name, the email name is used');
select is((select display_name from public.profiles where id = '33333333-3333-3333-3333-333333333333'), 'blank',
  'a blank name falls back to the email name');

select * from finish();
rollback;
