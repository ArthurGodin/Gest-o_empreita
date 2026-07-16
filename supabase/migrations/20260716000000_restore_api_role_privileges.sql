-- A database rebuilt only from the repository must expose the same API role
-- privileges as a Supabase project created through the dashboard. RLS remains
-- the authorization boundary for authenticated users.

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete
  on all tables in schema public
  to authenticated;
grant usage, select
  on all sequences in schema public
  to authenticated;

grant all privileges
  on all tables in schema public
  to service_role;
grant all privileges
  on all sequences in schema public
  to service_role;
grant execute
  on all functions in schema public
  to service_role;

-- Do not inherit PostgreSQL's broad PUBLIC function execution. Application
-- RPCs are listed explicitly; trigger functions are not callable by clients.
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.user_company_ids() to authenticated;
grant execute on function public.user_role_in(uuid) to authenticated;
grant execute on function public.next_quote_number(uuid) to authenticated;
grant execute on function public.replace_quote_items(
  uuid, uuid, text, text, uuid, date, text, jsonb
) to authenticated;
grant execute on function public.insert_diary_entry(
  uuid, uuid, text, jsonb
) to authenticated;
grant execute on function public.instantiate_template_stages(
  uuid, uuid, uuid
) to authenticated;

alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges for role postgres in schema public
  grant usage, select on sequences to authenticated;
alter default privileges for role postgres in schema public
  grant all privileges on tables to service_role;
alter default privileges for role postgres in schema public
  grant all privileges on sequences to service_role;
alter default privileges for role postgres in schema public
  grant execute on functions to service_role;

