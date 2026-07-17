begin;

create extension if not exists pg_trgm with schema extensions;

do $$ begin
  create type public.sinapi_release_status as enum (
    'staging',
    'published',
    'superseded',
    'rejected'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sinapi_reference_kind as enum ('input', 'composition');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sinapi_regime as enum (
    'sem_desoneracao',
    'com_desoneracao',
    'sem_encargos_sociais'
  );
exception when duplicate_object then null; end $$;

create or replace function public.is_valid_sinapi_prices(p_prices jsonb)
returns boolean
language sql
immutable
strict
set search_path = pg_catalog, public
as $$
  select
    jsonb_typeof(p_prices) = 'object'
    and not exists (
      select 1
      from jsonb_each(p_prices) as price(state_code, amount)
      where state_code !~ '^(AC|AL|AM|AP|BA|CE|DF|ES|GO|MA|MG|MS|MT|PA|PB|PE|PI|PR|RJ|RN|RO|RR|RS|SC|SE|SP|TO)$'
        or jsonb_typeof(amount) <> 'number'
        or amount::text !~ '^(0|[1-9][0-9]{0,15})$'
    );
$$;

create or replace function public.is_valid_sinapi_price_metadata(
  p_metadata jsonb
)
returns boolean
language sql
immutable
strict
set search_path = pg_catalog, public
as $$
  select
    jsonb_typeof(p_metadata) = 'object'
    and not exists (
      select 1
      from jsonb_each(p_metadata) as metadata(state_code, details)
      where state_code !~ '^(AC|AL|AM|AP|BA|CE|DF|ES|GO|MA|MG|MS|MT|PA|PB|PE|PI|PR|RJ|RN|RO|RR|RS|SC|SE|SP|TO)$'
        or jsonb_typeof(details) <> 'object'
        or (details - 'origin' - 'attributed_sp_basis_points') <> '{}'::jsonb
        or (
          details ? 'origin'
          and (
            jsonb_typeof(details->'origin') <> 'string'
            or length(details->>'origin') not between 1 and 80
          )
        )
        or (
          details ? 'attributed_sp_basis_points'
          and (
            jsonb_typeof(details->'attributed_sp_basis_points') <> 'number'
            or (details->'attributed_sp_basis_points')::text !~ '^(0|[1-9][0-9]{0,3}|10000)$'
          )
        )
    );
$$;

create table public.sinapi_releases (
  id uuid primary key default gen_random_uuid(),
  competence date not null,
  revision smallint not null default 1,
  status public.sinapi_release_status not null default 'staging',
  source_url text not null,
  source_file_name text not null,
  source_storage_path text not null,
  source_sha256 text not null,
  source_size_bytes bigint not null,
  source_published_at timestamptz,
  layout_id text not null,
  imported_at timestamptz not null default now(),
  published_at timestamptz,
  superseded_at timestamptz,
  imported_by text,
  row_count integer not null default 0,
  priced_row_count integer not null default 0,
  validation_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint sinapi_releases_competence_month_chk check (
    competence = date_trunc('month', competence)::date
    and competence between date '2000-01-01' and date '2100-12-01'
  ),
  constraint sinapi_releases_revision_chk check (revision > 0),
  constraint sinapi_releases_source_url_chk check (
    source_url ~ '^https://'
    and length(source_url) <= 1000
  ),
  constraint sinapi_releases_source_file_name_chk check (
    btrim(source_file_name) <> ''
    and length(source_file_name) <= 255
    and source_file_name !~ '[/\\]'
  ),
  constraint sinapi_releases_storage_path_chk check (
    btrim(source_storage_path) <> ''
    and length(source_storage_path) <= 1000
    and source_storage_path !~ '(^|/)\.\.(/|$)'
  ),
  constraint sinapi_releases_sha256_chk check (
    source_sha256 ~ '^[0-9a-f]{64}$'
  ),
  constraint sinapi_releases_source_size_chk check (source_size_bytes > 0),
  constraint sinapi_releases_layout_id_chk check (
    btrim(layout_id) <> '' and length(layout_id) <= 100
  ),
  constraint sinapi_releases_imported_by_chk check (
    imported_by is null or length(imported_by) <= 120
  ),
  constraint sinapi_releases_counts_chk check (
    row_count >= 0
    and priced_row_count >= 0
    and priced_row_count <= row_count
  ),
  constraint sinapi_releases_validation_summary_chk check (
    jsonb_typeof(validation_summary) = 'object'
  ),
  constraint sinapi_releases_status_timestamps_chk check (
    (status in ('staging', 'rejected') and published_at is null and superseded_at is null)
    or (status = 'published' and published_at is not null and superseded_at is null)
    or (status = 'superseded' and published_at is not null and superseded_at is not null)
  ),
  unique (competence, revision),
  unique (source_sha256)
);

create unique index sinapi_releases_one_published_competence_uq
  on public.sinapi_releases (competence)
  where status = 'published';

create index sinapi_releases_status_competence_idx
  on public.sinapi_releases (status, competence desc, revision desc);

create table public.sinapi_entries (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null
    references public.sinapi_releases(id) on delete cascade,
  kind public.sinapi_reference_kind not null,
  code text not null,
  description text not null,
  unit text not null,
  regime public.sinapi_regime not null,
  prices_cents jsonb not null,
  price_metadata jsonb not null default '{}'::jsonb,
  search_text text not null,
  created_at timestamptz not null default now(),
  constraint sinapi_entries_code_chk check (
    btrim(code) <> ''
    and length(code) <= 40
    and code ~ '^[A-Z0-9][A-Z0-9._/-]*$'
    and code !~ '^0+$'
  ),
  constraint sinapi_entries_description_chk check (
    btrim(description) <> '' and length(description) <= 500
  ),
  constraint sinapi_entries_unit_chk check (
    btrim(unit) <> '' and length(unit) <= 20
  ),
  constraint sinapi_entries_prices_chk check (
    public.is_valid_sinapi_prices(prices_cents)
  ),
  constraint sinapi_entries_price_metadata_chk check (
    public.is_valid_sinapi_price_metadata(price_metadata)
  ),
  constraint sinapi_entries_search_text_chk check (
    btrim(search_text) <> '' and length(search_text) <= 700
  ),
  unique (release_id, kind, code, regime)
);

create index sinapi_entries_release_kind_regime_code_idx
  on public.sinapi_entries (release_id, kind, regime, code);

create index sinapi_entries_search_text_trgm_idx
  on public.sinapi_entries
  using gin (search_text extensions.gin_trgm_ops);

create or replace function public.tg_sinapi_protect_release()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_is_database_admin boolean := current_user in ('postgres', 'supabase_admin');
begin
  if tg_op = 'DELETE' then
    if old.status in ('published', 'superseded') and not v_is_database_admin then
      raise exception 'published SINAPI releases are immutable'
        using errcode = '55000';
    end if;
    return old;
  end if;

  if old.status in ('published', 'superseded') and not v_is_database_admin then
    raise exception 'published SINAPI releases are immutable'
      using errcode = '55000';
  end if;

  if new.status is distinct from old.status and not v_is_database_admin then
    raise exception 'SINAPI release status must use an administrative function'
      using errcode = '42501';
  end if;

  if exists (
    select 1 from public.sinapi_entries where release_id = old.id limit 1
  ) and (
    new.competence is distinct from old.competence
    or new.revision is distinct from old.revision
    or new.source_sha256 is distinct from old.source_sha256
  ) then
    raise exception 'SINAPI release identity is immutable after entry import'
      using errcode = '55000';
  end if;

  return new;
end;
$$;

create trigger sinapi_releases_protect
  before update or delete on public.sinapi_releases
  for each row execute function public.tg_sinapi_protect_release();

create or replace function public.tg_sinapi_guard_entry_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_release_id uuid;
  v_status public.sinapi_release_status;
  v_is_database_admin boolean := current_user in ('postgres', 'supabase_admin');
begin
  if tg_op = 'DELETE' then
    v_release_id := old.release_id;
  else
    v_release_id := new.release_id;
  end if;

  select status into v_status
  from public.sinapi_releases
  where id = v_release_id;

  if v_status is null then
    raise exception 'SINAPI release not found' using errcode = '23503';
  end if;

  if tg_op = 'INSERT' and v_status <> 'staging' then
    raise exception 'SINAPI entries can only be inserted into a staging release'
      using errcode = '55000';
  end if;

  if tg_op = 'UPDATE' and v_status <> 'staging' and not v_is_database_admin then
    raise exception 'published SINAPI entries are immutable'
      using errcode = '55000';
  end if;

  if tg_op = 'DELETE'
    and v_status in ('published', 'superseded')
    and not v_is_database_admin
  then
    raise exception 'published SINAPI entries are immutable'
      using errcode = '55000';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger sinapi_entries_guard_mutation
  before insert or update or delete on public.sinapi_entries
  for each row execute function public.tg_sinapi_guard_entry_mutation();

create or replace function public.publish_sinapi_release(
  p_release_id uuid,
  p_expected_sha256 text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_release public.sinapi_releases%rowtype;
  v_row_count integer;
  v_priced_row_count integer;
begin
  select * into v_release
  from public.sinapi_releases
  where id = p_release_id
  for update;

  if not found then
    raise exception 'SINAPI release not found' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_release.competence::text, 0));

  if v_release.status <> 'staging' then
    raise exception 'only a staging SINAPI release can be published'
      using errcode = '55000';
  end if;

  if v_release.source_sha256 <> lower(p_expected_sha256) then
    raise exception 'SINAPI source hash does not match'
      using errcode = '22000';
  end if;

  if coalesce((v_release.validation_summary->>'approved')::boolean, false) is not true then
    raise exception 'SINAPI validation report is not approved'
      using errcode = '22000';
  end if;

  select
    count(*)::integer,
    count(*) filter (where prices_cents <> '{}'::jsonb)::integer
  into v_row_count, v_priced_row_count
  from public.sinapi_entries
  where release_id = p_release_id;

  if v_row_count <= 0
    or v_priced_row_count <= 0
    or v_release.row_count <> v_row_count
    or v_release.priced_row_count <> v_priced_row_count
  then
    raise exception 'SINAPI release counts do not match imported entries'
      using errcode = '22000';
  end if;

  if exists (
    select 1
    from public.sinapi_releases existing
    where existing.competence = v_release.competence
      and existing.status = 'published'
      and existing.revision >= v_release.revision
  ) then
    raise exception 'SINAPI revision must be newer than the published revision'
      using errcode = '22000';
  end if;

  update public.sinapi_releases
  set
    status = 'superseded',
    superseded_at = now()
  where competence = v_release.competence
    and status = 'published'
    and id <> p_release_id;

  update public.sinapi_releases
  set
    status = 'published',
    published_at = now(),
    superseded_at = null
  where id = p_release_id;

  return p_release_id;
end;
$$;

create or replace function public.reject_sinapi_release(
  p_release_id uuid,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_reason is null or btrim(p_reason) = '' or length(p_reason) > 500 then
    raise exception 'a rejection reason between 1 and 500 characters is required'
      using errcode = '22000';
  end if;

  update public.sinapi_releases
  set
    status = 'rejected',
    validation_summary = validation_summary || jsonb_build_object(
      'approved', false,
      'rejection_reason', btrim(p_reason)
    )
  where id = p_release_id
    and status = 'staging';

  if not found then
    raise exception 'staging SINAPI release not found' using errcode = 'P0002';
  end if;

  return p_release_id;
end;
$$;

alter table public.sinapi_releases enable row level security;
alter table public.sinapi_entries enable row level security;

revoke all on table public.sinapi_releases from public, anon, authenticated;
revoke all on table public.sinapi_entries from public, anon, authenticated;
grant all on table public.sinapi_releases to service_role;
grant all on table public.sinapi_entries to service_role;

revoke execute on function public.is_valid_sinapi_prices(jsonb)
  from public, anon, authenticated;
revoke execute on function public.is_valid_sinapi_price_metadata(jsonb)
  from public, anon, authenticated;
revoke execute on function public.tg_sinapi_protect_release()
  from public, anon, authenticated;
revoke execute on function public.tg_sinapi_guard_entry_mutation()
  from public, anon, authenticated;
revoke execute on function public.publish_sinapi_release(uuid, text)
  from public, anon, authenticated;
revoke execute on function public.reject_sinapi_release(uuid, text)
  from public, anon, authenticated;

grant execute on function public.is_valid_sinapi_prices(jsonb) to service_role;
grant execute on function public.is_valid_sinapi_price_metadata(jsonb) to service_role;
grant execute on function public.publish_sinapi_release(uuid, text) to service_role;
grant execute on function public.reject_sinapi_release(uuid, text) to service_role;

insert into storage.buckets (id, name, public)
values ('sinapi-sources', 'sinapi-sources', false)
on conflict (id) do update set public = false;

commit;
