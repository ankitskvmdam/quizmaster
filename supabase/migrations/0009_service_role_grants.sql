-- The content and invite CLIs run as service_role. Newer hosted Supabase projects no longer grant API roles on
-- new tables by default (the cloud returned 403 on every table), so grant service_role explicitly, now and for
-- future objects. service_role bypasses RLS; it is only ever used by the CLIs, never in the browser.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;
