-- Keep Free plan quotas correct even when concurrent requests bypass the
-- application-level pre-checks. Transaction advisory locks serialize writes
-- per company without blocking unrelated tenants.

create or replace function public.enforce_free_quote_monthly_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  company_plan text;
  quota_start timestamptz;
  quota_end timestamptz;
  quote_count integer;
begin
  perform pg_advisory_xact_lock(
    hashtextextended('prumo:free-quotes:' || new.company_id::text, 0)
  );

  select coalesce(plan, 'free')
    into company_plan
    from public.companies
   where id = new.company_id;

  if company_plan is distinct from 'free' then
    return new;
  end if;

  -- Free accounts cannot backdate inserts to avoid the current-month quota.
  new.created_at := current_timestamp;
  quota_start := date_trunc(
    'month',
    current_timestamp at time zone 'America/Sao_Paulo'
  ) at time zone 'America/Sao_Paulo';
  quota_end := quota_start + interval '1 month';

  select count(*)
    into quote_count
    from public.quotes
   where company_id = new.company_id
     and created_at >= quota_start
     and created_at < quota_end;

  if quote_count >= 3 then
    raise exception using
      errcode = 'P0001',
      message = 'free_quote_limit_reached';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_free_quote_monthly_limit() from public;
revoke all on function public.enforce_free_quote_monthly_limit() from anon;
revoke all on function public.enforce_free_quote_monthly_limit() from authenticated;

drop trigger if exists quotes_enforce_free_monthly_limit on public.quotes;
create trigger quotes_enforce_free_monthly_limit
before insert on public.quotes
for each row execute function public.enforce_free_quote_monthly_limit();

create or replace function public.enforce_free_active_project_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  company_plan text;
  active_project_count integer;
begin
  if new.status not in ('planning', 'in_progress', 'paused') then
    return new;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('prumo:free-projects:' || new.company_id::text, 0)
  );

  select coalesce(plan, 'free')
    into company_plan
    from public.companies
   where id = new.company_id;

  if company_plan is distinct from 'free' then
    return new;
  end if;

  select count(*)
    into active_project_count
    from public.projects
   where company_id = new.company_id
     and status in ('planning', 'in_progress', 'paused')
     and (tg_op <> 'UPDATE' or id <> new.id);

  if active_project_count >= 1 then
    raise exception using
      errcode = 'P0001',
      message = 'free_active_project_limit_reached';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_free_active_project_limit() from public;
revoke all on function public.enforce_free_active_project_limit() from anon;
revoke all on function public.enforce_free_active_project_limit() from authenticated;

drop trigger if exists projects_enforce_free_active_limit on public.projects;
create trigger projects_enforce_free_active_limit
before insert or update of status, company_id on public.projects
for each row execute function public.enforce_free_active_project_limit();

