-- Invite-only sign-up: Supabase Auth calls this "before user created" hook.
-- Enable it in supabase/config.toml locally and in the dashboard (Auth → Hooks) in the cloud.
create function public.hook_check_allowlist(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = public, extensions
as $$
declare
  v_email text := event -> 'user' ->> 'email';
begin
  if v_email is not null and exists (select 1 from public.allowed_emails a where a.email = v_email::extensions.citext) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object('error', jsonb_build_object(
    'http_code', 403,
    'message', 'This email hasn''t been invited yet. Ask the person who shared this link to add you.'));
end;
$$;

revoke execute on function public.hook_check_allowlist(jsonb) from public, anon, authenticated;
grant usage on schema public, extensions to supabase_auth_admin;
grant execute on function public.hook_check_allowlist(jsonb) to supabase_auth_admin;
grant select on public.allowed_emails to supabase_auth_admin;
create policy "auth hook reads the allowlist" on public.allowed_emails
  for select to supabase_auth_admin using (true);
