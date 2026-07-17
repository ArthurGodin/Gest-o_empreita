begin;

create table public.operational_monitor_runs (
  id uuid primary key default gen_random_uuid(),
  run_key text not null unique,
  trigger text not null,
  status text not null default 'running',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  check_counts jsonb not null default '{"healthy":0,"warning":0,"critical":0}'::jsonb,
  incident_count integer not null default 0,
  alert_count smallint not null default 0,
  error_code text,
  created_at timestamptz not null default now(),
  constraint operational_monitor_runs_key_chk check (
    run_key ~ '^(cron:[0-9]{4}-[0-9]{2}-[0-9]{2}|manual:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$'
    and length(run_key) <= 64
  ),
  constraint operational_monitor_runs_trigger_chk check (
    trigger in ('cron', 'manual')
  ),
  constraint operational_monitor_runs_status_chk check (
    status in ('running', 'healthy', 'warning', 'critical', 'failed')
  ),
  constraint operational_monitor_runs_check_counts_chk check (
    jsonb_typeof(check_counts) = 'object'
    and (check_counts - 'healthy' - 'warning' - 'critical') = '{}'::jsonb
    and check_counts ?& array['healthy', 'warning', 'critical']
    and jsonb_typeof(check_counts->'healthy') = 'number'
    and jsonb_typeof(check_counts->'warning') = 'number'
    and jsonb_typeof(check_counts->'critical') = 'number'
    and check_counts->>'healthy' ~ '^(0|[1-9][0-9]{0,8})$'
    and check_counts->>'warning' ~ '^(0|[1-9][0-9]{0,8})$'
    and check_counts->>'critical' ~ '^(0|[1-9][0-9]{0,8})$'
  ),
  constraint operational_monitor_runs_totals_chk check (
    incident_count between 0 and 100000000
    and alert_count between 0 and 3
  ),
  constraint operational_monitor_runs_error_code_chk check (
    error_code is null
    or (
      length(error_code) <= 80
      and error_code ~ '^[a-z0-9][a-z0-9_.:-]*$'
    )
  ),
  constraint operational_monitor_runs_timestamps_chk check (
    (status = 'running' and finished_at is null and error_code is null)
    or (
      status in ('healthy', 'warning', 'critical')
      and finished_at is not null
      and finished_at >= started_at
    )
    or (
      status = 'failed'
      and finished_at is not null
      and finished_at >= started_at
      and error_code is not null
    )
  )
);

create index operational_monitor_runs_started_idx
  on public.operational_monitor_runs (started_at desc);

create index operational_monitor_runs_status_started_idx
  on public.operational_monitor_runs (status, started_at desc);

create or replace function public.tg_operational_monitor_run_transition()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.id is distinct from old.id
    or new.run_key is distinct from old.run_key
    or new.trigger is distinct from old.trigger
    or new.started_at is distinct from old.started_at
    or new.created_at is distinct from old.created_at
  then
    raise exception 'operational monitor run identity is immutable'
      using errcode = '55000';
  end if;

  if old.status <> 'running' then
    raise exception 'completed operational monitor runs are immutable'
      using errcode = '55000';
  end if;

  if new.status = 'running' then
    raise exception 'operational monitor run must transition to a final status'
      using errcode = '55000';
  end if;

  return new;
end;
$$;

create trigger operational_monitor_runs_transition
  before update on public.operational_monitor_runs
  for each row execute function public.tg_operational_monitor_run_transition();

create table public.operational_incidents (
  fingerprint text primary key,
  check_name text not null,
  severity text not null,
  status text not null default 'open',
  summary text not null,
  safe_context jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_notified_at timestamptz,
  resolved_at timestamptz,
  occurrence_count integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint operational_incidents_fingerprint_chk check (
    length(fingerprint) between 3 and 180
    and fingerprint ~ '^[a-z0-9][a-z0-9:._-]*$'
  ),
  constraint operational_incidents_check_name_chk check (
    length(check_name) between 3 and 80
    and check_name ~ '^[a-z0-9][a-z0-9._-]*$'
  ),
  constraint operational_incidents_severity_chk check (
    severity in ('warning', 'critical')
  ),
  constraint operational_incidents_status_chk check (
    status in ('open', 'resolved')
  ),
  constraint operational_incidents_summary_chk check (
    btrim(summary) <> '' and length(summary) <= 240
  ),
  constraint operational_incidents_context_chk check (
    jsonb_typeof(safe_context) = 'object'
    and pg_column_size(safe_context) <= 4096
  ),
  constraint operational_incidents_occurrence_chk check (
    occurrence_count between 1 and 100000000
  ),
  constraint operational_incidents_timestamps_chk check (
    last_seen_at >= first_seen_at
    and (last_notified_at is null or last_notified_at >= first_seen_at)
    and (
      (status = 'open' and resolved_at is null)
      or (
        status = 'resolved'
        and resolved_at is not null
        and resolved_at >= first_seen_at
      )
    )
  )
);

create index operational_incidents_open_severity_idx
  on public.operational_incidents (severity, last_seen_at desc)
  where status = 'open';

create index operational_incidents_notification_idx
  on public.operational_incidents (last_notified_at, last_seen_at desc)
  where status = 'open';

create index operational_incidents_resolved_idx
  on public.operational_incidents (resolved_at desc)
  where status = 'resolved';

create or replace function public.tg_operational_incident_guard()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.fingerprint is distinct from old.fingerprint
    or new.check_name is distinct from old.check_name
    or new.first_seen_at is distinct from old.first_seen_at
    or new.created_at is distinct from old.created_at
  then
    raise exception 'operational incident identity is immutable'
      using errcode = '55000';
  end if;

  if new.last_seen_at < old.last_seen_at
    or new.occurrence_count < old.occurrence_count
    or (
      old.last_notified_at is not null
      and (
        new.last_notified_at is null
        or new.last_notified_at < old.last_notified_at
      )
    )
  then
    raise exception 'operational incident lifecycle cannot move backwards'
      using errcode = '55000';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger operational_incidents_guard
  before update on public.operational_incidents
  for each row execute function public.tg_operational_incident_guard();

alter table public.operational_monitor_runs enable row level security;
alter table public.operational_incidents enable row level security;

revoke all on table public.operational_monitor_runs
  from public, anon, authenticated, service_role;
revoke all on table public.operational_incidents
  from public, anon, authenticated, service_role;

grant select, insert, update
  on table public.operational_monitor_runs to service_role;
grant select, insert, update
  on table public.operational_incidents to service_role;

revoke all on function public.tg_operational_monitor_run_transition()
  from public, anon, authenticated;
revoke all on function public.tg_operational_incident_guard()
  from public, anon, authenticated;

comment on table public.operational_monitor_runs is
  'Private sanitized execution history. Never store PII, secrets, provider bodies, or stack traces.';
comment on table public.operational_incidents is
  'Private sanitized incident lifecycle. Never store PII, secrets, raw webhooks, payment URLs, or provider bodies.';
comment on column public.operational_incidents.safe_context is
  'Allowlisted technical context only; no customer data, documents, tokens, URLs, or raw payloads.';

commit;
