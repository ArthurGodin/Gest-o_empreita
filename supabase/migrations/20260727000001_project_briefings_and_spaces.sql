-- Briefings versionados e programa de necessidades para Arquitetura e
-- Interiores. Todas as estruturas são aditivas e tenant-scoped.

do $$
begin
  create type public.project_briefing_status
    as enum ('draft', 'shared', 'submitted', 'reviewed', 'archived');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.project_space_priority
    as enum ('low', 'normal', 'high', 'essential');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.project_space_status
    as enum ('incomplete', 'defined');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.project_space_requirement_kind
    as enum ('need', 'constraint', 'preference');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.project_space_requirement_status
    as enum ('pending', 'defined');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.project_briefings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  template_key text not null,
  status public.project_briefing_status not null default 'draft',
  active_revision_id uuid,
  internal_notes text,
  shared_at timestamptz,
  reviewed_at timestamptz,
  archived_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint project_briefings_template_key_chk
    check (template_key ~ '^[a-z][a-z0-9_-]{0,119}$'),
  constraint project_briefings_internal_notes_chk
    check (internal_notes is null or char_length(internal_notes) <= 5000),
  constraint project_briefings_archive_state_chk
    check (
      (status = 'archived' and archived_at is not null)
      or (status <> 'archived' and archived_at is null)
    )
);

create unique index if not exists project_briefings_one_active_project_uq
  on public.project_briefings (project_id)
  where archived_at is null;

create index if not exists project_briefings_company_status_idx
  on public.project_briefings (company_id, status, updated_at desc);

create table if not exists public.project_briefing_revisions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  briefing_id uuid not null
    references public.project_briefings(id) on delete cascade,
  revision_number integer not null,
  schema_version integer not null,
  schema_snapshot jsonb not null,
  answers jsonb not null default '{}'::jsonb,
  respondent_name text,
  reopen_note text,
  edit_version bigint not null default 0,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint project_briefing_revisions_number_chk
    check (revision_number > 0),
  constraint project_briefing_revisions_schema_version_chk
    check (schema_version > 0),
  constraint project_briefing_revisions_schema_chk
    check (
      jsonb_typeof(schema_snapshot) = 'object'
      and octet_length(schema_snapshot::text) <= 65536
    ),
  constraint project_briefing_revisions_answers_chk
    check (
      jsonb_typeof(answers) = 'object'
      and octet_length(answers::text) <= 65536
    ),
  constraint project_briefing_revisions_respondent_chk
    check (
      respondent_name is null
      or char_length(btrim(respondent_name)) between 2 and 120
    ),
  constraint project_briefing_revisions_reopen_note_chk
    check (reopen_note is null or char_length(reopen_note) <= 1000),
  constraint project_briefing_revisions_edit_version_chk
    check (edit_version >= 0),
  constraint project_briefing_revisions_number_uq
    unique (briefing_id, revision_number)
);

alter table public.project_briefings
  drop constraint if exists project_briefings_active_revision_fkey;
alter table public.project_briefings
  add constraint project_briefings_active_revision_fkey
  foreign key (active_revision_id)
  references public.project_briefing_revisions(id)
  on delete restrict
  deferrable initially deferred;

create index if not exists project_briefing_revisions_project_idx
  on public.project_briefing_revisions (
    project_id,
    briefing_id,
    revision_number desc
  );

create table if not exists public.project_spaces (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  space_type text not null default 'other',
  area_m2 numeric(12,2),
  priority public.project_space_priority not null default 'normal',
  status public.project_space_status not null default 'incomplete',
  notes text,
  position integer not null default 0,
  archived_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint project_spaces_name_chk
    check (char_length(btrim(name)) between 1 and 120),
  constraint project_spaces_type_chk
    check (space_type ~ '^[a-z][a-z0-9_]{0,79}$'),
  constraint project_spaces_area_chk
    check (area_m2 is null or area_m2 between 0.01 and 100000),
  constraint project_spaces_notes_chk
    check (notes is null or char_length(notes) <= 3000),
  constraint project_spaces_position_chk
    check (position >= 0)
);

create index if not exists project_spaces_project_idx
  on public.project_spaces (project_id, position, created_at);

create index if not exists project_spaces_company_active_idx
  on public.project_spaces (company_id, project_id)
  where archived_at is null;

create table if not exists public.project_space_requirements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  space_id uuid not null references public.project_spaces(id) on delete cascade,
  kind public.project_space_requirement_kind not null default 'need',
  description text not null,
  priority public.project_space_priority not null default 'normal',
  status public.project_space_requirement_status not null default 'pending',
  source_revision_id uuid
    references public.project_briefing_revisions(id) on delete set null,
  position integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint project_space_requirements_description_chk
    check (char_length(btrim(description)) between 1 and 1000),
  constraint project_space_requirements_position_chk
    check (position >= 0)
);

create index if not exists project_space_requirements_space_idx
  on public.project_space_requirements (space_id, position, created_at);

create index if not exists project_space_requirements_project_pending_idx
  on public.project_space_requirements (project_id, status)
  where status = 'pending';

create or replace function public.tg_project_briefing_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.projects project_row
    where project_row.id = new.project_id
      and project_row.company_id = new.company_id
  ) then
    raise exception 'briefing_project_scope_mismatch'
      using errcode = '23514';
  end if;

  if new.active_revision_id is not null and not exists (
    select 1
    from public.project_briefing_revisions revision_row
    where revision_row.id = new.active_revision_id
      and revision_row.briefing_id = new.id
      and revision_row.project_id = new.project_id
      and revision_row.company_id = new.company_id
  ) then
    raise exception 'briefing_revision_scope_mismatch'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function public.tg_project_briefing_revision_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.project_briefings briefing
    where briefing.id = new.briefing_id
      and briefing.project_id = new.project_id
      and briefing.company_id = new.company_id
  ) then
    raise exception 'briefing_revision_scope_mismatch'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function public.tg_guard_submitted_briefing_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.submitted_at is not null and new is distinct from old then
    raise exception 'submitted_briefing_revision_immutable'
      using errcode = '55000';
  end if;

  return new;
end;
$$;

create or replace function public.tg_project_space_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.projects project_row
    where project_row.id = new.project_id
      and project_row.company_id = new.company_id
  ) then
    raise exception 'project_space_scope_mismatch'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function public.tg_project_space_requirement_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.project_spaces space_row
    where space_row.id = new.space_id
      and space_row.project_id = new.project_id
      and space_row.company_id = new.company_id
  ) then
    raise exception 'project_space_requirement_scope_mismatch'
      using errcode = '23514';
  end if;

  if new.source_revision_id is not null and not exists (
    select 1
    from public.project_briefing_revisions revision_row
    where revision_row.id = new.source_revision_id
      and revision_row.project_id = new.project_id
      and revision_row.company_id = new.company_id
  ) then
    raise exception 'project_space_requirement_revision_scope_mismatch'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function public.project_briefing_active_limit(p_plan text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case
    when p_plan = 'ultimate' then 500
    when p_plan = 'pro' then 200
    else 1
  end
$$;

create or replace function public.project_briefing_revision_limit(p_plan text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case
    when p_plan = 'ultimate' then 100
    when p_plan = 'pro' then 25
    else 1
  end
$$;

create or replace function public.project_space_active_limit(p_plan text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case
    when p_plan = 'ultimate' then 250
    when p_plan = 'pro' then 100
    else 3
  end
$$;

create or replace function public.tg_enforce_project_space_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan text;
  v_active_count integer;
begin
  if new.archived_at is not null then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.archived_at is null then
    return new;
  end if;

  select company_row.plan
  into v_plan
  from public.companies company_row
  where company_row.id = new.company_id
  for update;

  if not found then
    raise exception 'company_not_found' using errcode = '42501';
  end if;

  select count(*)
  into v_active_count
  from public.project_spaces space_row
  where space_row.project_id = new.project_id
    and space_row.archived_at is null
    and space_row.id <> new.id;

  if v_active_count >= public.project_space_active_limit(v_plan) then
    raise exception 'project_space_limit_reached' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists project_briefings_scope
  on public.project_briefings;
create constraint trigger project_briefings_scope
  after insert or update on public.project_briefings
  deferrable initially deferred
  for each row execute function public.tg_project_briefing_scope();

drop trigger if exists project_briefing_revisions_scope
  on public.project_briefing_revisions;
create trigger project_briefing_revisions_scope
  before insert or update on public.project_briefing_revisions
  for each row execute function public.tg_project_briefing_revision_scope();

drop trigger if exists project_briefing_revisions_immutable
  on public.project_briefing_revisions;
create trigger project_briefing_revisions_immutable
  before update on public.project_briefing_revisions
  for each row execute function public.tg_guard_submitted_briefing_revision();

drop trigger if exists project_spaces_scope
  on public.project_spaces;
create trigger project_spaces_scope
  before insert or update on public.project_spaces
  for each row execute function public.tg_project_space_scope();

drop trigger if exists project_spaces_limit
  on public.project_spaces;
create trigger project_spaces_limit
  before insert or update of archived_at on public.project_spaces
  for each row execute function public.tg_enforce_project_space_limit();

drop trigger if exists project_space_requirements_scope
  on public.project_space_requirements;
create trigger project_space_requirements_scope
  before insert or update on public.project_space_requirements
  for each row execute function public.tg_project_space_requirement_scope();

drop trigger if exists project_briefings_set_updated_at
  on public.project_briefings;
create trigger project_briefings_set_updated_at
  before update on public.project_briefings
  for each row execute function public.tg_set_updated_at();

drop trigger if exists project_briefing_revisions_set_updated_at
  on public.project_briefing_revisions;
create trigger project_briefing_revisions_set_updated_at
  before update on public.project_briefing_revisions
  for each row execute function public.tg_set_updated_at();

drop trigger if exists project_spaces_set_updated_at
  on public.project_spaces;
create trigger project_spaces_set_updated_at
  before update on public.project_spaces
  for each row execute function public.tg_set_updated_at();

drop trigger if exists project_space_requirements_set_updated_at
  on public.project_space_requirements;
create trigger project_space_requirements_set_updated_at
  before update on public.project_space_requirements
  for each row execute function public.tg_set_updated_at();

alter table public.project_briefings enable row level security;
alter table public.project_briefing_revisions enable row level security;
alter table public.project_spaces enable row level security;
alter table public.project_space_requirements enable row level security;

drop policy if exists "tenant scoped - select"
  on public.project_briefings;
create policy "tenant scoped - select"
  on public.project_briefings
  for select to authenticated
  using (company_id in (select public.user_company_ids()));

drop policy if exists "tenant scoped - select"
  on public.project_briefing_revisions;
create policy "tenant scoped - select"
  on public.project_briefing_revisions
  for select to authenticated
  using (company_id in (select public.user_company_ids()));

drop policy if exists "tenant scoped - select"
  on public.project_spaces;
create policy "tenant scoped - select"
  on public.project_spaces
  for select to authenticated
  using (company_id in (select public.user_company_ids()));

drop policy if exists "tenant scoped - insert"
  on public.project_spaces;
create policy "tenant scoped - insert"
  on public.project_spaces
  for insert to authenticated
  with check (
    company_id in (select public.user_company_ids())
    and created_by = auth.uid()
  );

drop policy if exists "tenant scoped - update"
  on public.project_spaces;
create policy "tenant scoped - update"
  on public.project_spaces
  for update to authenticated
  using (company_id in (select public.user_company_ids()))
  with check (company_id in (select public.user_company_ids()));

drop policy if exists "tenant scoped - delete"
  on public.project_spaces;
create policy "tenant scoped - delete"
  on public.project_spaces
  for delete to authenticated
  using (company_id in (select public.user_company_ids()));

drop policy if exists "tenant scoped - select"
  on public.project_space_requirements;
create policy "tenant scoped - select"
  on public.project_space_requirements
  for select to authenticated
  using (company_id in (select public.user_company_ids()));

drop policy if exists "tenant scoped - insert"
  on public.project_space_requirements;
create policy "tenant scoped - insert"
  on public.project_space_requirements
  for insert to authenticated
  with check (
    company_id in (select public.user_company_ids())
    and created_by = auth.uid()
  );

drop policy if exists "tenant scoped - update"
  on public.project_space_requirements;
create policy "tenant scoped - update"
  on public.project_space_requirements
  for update to authenticated
  using (company_id in (select public.user_company_ids()))
  with check (company_id in (select public.user_company_ids()));

drop policy if exists "tenant scoped - delete"
  on public.project_space_requirements;
create policy "tenant scoped - delete"
  on public.project_space_requirements
  for delete to authenticated
  using (company_id in (select public.user_company_ids()));

create or replace function public.create_project_briefing(
  p_project_id uuid,
  p_template_key text,
  p_schema_version integer,
  p_schema_snapshot jsonb
)
returns table (
  briefing_id uuid,
  revision_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company_id uuid;
  v_plan text;
  v_segment text;
  v_project_status public.project_status;
  v_active_count integer;
  v_briefing_id uuid := gen_random_uuid();
  v_revision_id uuid := gen_random_uuid();
begin
  select
    project_row.company_id,
    company_row.plan,
    company_row.business_segment,
    project_row.status
  into
    v_company_id,
    v_plan,
    v_segment,
    v_project_status
  from public.projects project_row
  join public.companies company_row on company_row.id = project_row.company_id
  where project_row.id = p_project_id
    and exists (
      select 1
      from public.company_members membership
      where membership.company_id = project_row.company_id
        and membership.user_id = auth.uid()
    )
  for update of company_row, project_row;

  if not found then
    raise exception 'project_not_found' using errcode = '42501';
  end if;

  if v_segment not in ('architecture', 'interiors') then
    raise exception 'briefing_segment_not_enabled' using errcode = '55000';
  end if;

  if v_project_status in ('completed', 'cancelled') then
    raise exception 'project_briefing_locked' using errcode = '55000';
  end if;

  if char_length(coalesce(p_template_key, '')) not between 1 and 120
    or p_template_key !~ '^[a-z][a-z0-9_-]{0,119}$'
    or p_schema_version is null
    or p_schema_version < 1
    or p_schema_snapshot is null
    or jsonb_typeof(p_schema_snapshot) <> 'object'
    or octet_length(p_schema_snapshot::text) > 65536 then
    raise exception 'invalid_briefing_template' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.project_briefings briefing
    where briefing.project_id = p_project_id
      and briefing.archived_at is null
  ) then
    raise exception 'active_briefing_exists' using errcode = '23505';
  end if;

  select count(*)
  into v_active_count
  from public.project_briefings briefing
  where briefing.company_id = v_company_id
    and briefing.archived_at is null;

  if v_active_count >= public.project_briefing_active_limit(v_plan) then
    raise exception 'project_briefing_limit_reached' using errcode = 'P0001';
  end if;

  insert into public.project_briefings (
    id,
    company_id,
    project_id,
    template_key,
    status,
    active_revision_id,
    created_by
  ) values (
    v_briefing_id,
    v_company_id,
    p_project_id,
    p_template_key,
    'draft',
    null,
    auth.uid()
  );

  insert into public.project_briefing_revisions (
    id,
    company_id,
    project_id,
    briefing_id,
    revision_number,
    schema_version,
    schema_snapshot,
    answers
  ) values (
    v_revision_id,
    v_company_id,
    p_project_id,
    v_briefing_id,
    1,
    p_schema_version,
    p_schema_snapshot,
    '{}'::jsonb
  );

  update public.project_briefings
  set active_revision_id = v_revision_id
  where id = v_briefing_id;

  briefing_id := v_briefing_id;
  revision_id := v_revision_id;
  return next;
end;
$$;

create or replace function public.share_project_briefing(
  p_briefing_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_id uuid;
  v_status public.project_briefing_status;
begin
  select briefing.project_id, briefing.status
  into v_project_id, v_status
  from public.project_briefings briefing
  where briefing.id = p_briefing_id
    and briefing.archived_at is null
    and exists (
      select 1
      from public.company_members membership
      where membership.company_id = briefing.company_id
        and membership.user_id = auth.uid()
    )
  for update;

  if not found then
    raise exception 'briefing_not_found' using errcode = '42501';
  end if;

  if v_status not in ('draft', 'shared') then
    raise exception 'briefing_cannot_be_shared' using errcode = '55000';
  end if;

  update public.project_briefings
  set
    status = 'shared',
    shared_at = coalesce(shared_at, now())
  where id = p_briefing_id;

  return v_project_id;
end;
$$;

create or replace function public.review_project_briefing(
  p_briefing_id uuid,
  p_internal_notes text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_id uuid;
begin
  if p_internal_notes is not null
    and char_length(p_internal_notes) > 5000 then
    raise exception 'invalid_briefing_notes' using errcode = '22023';
  end if;

  select briefing.project_id
  into v_project_id
  from public.project_briefings briefing
  where briefing.id = p_briefing_id
    and briefing.status in ('submitted', 'reviewed')
    and briefing.archived_at is null
    and exists (
      select 1
      from public.company_members membership
      where membership.company_id = briefing.company_id
        and membership.user_id = auth.uid()
    )
  for update;

  if not found then
    raise exception 'briefing_not_ready_for_review' using errcode = '55000';
  end if;

  update public.project_briefings
  set
    status = 'reviewed',
    internal_notes = nullif(btrim(coalesce(p_internal_notes, '')), ''),
    reviewed_at = coalesce(reviewed_at, now())
  where id = p_briefing_id;

  return v_project_id;
end;
$$;

create or replace function public.reopen_project_briefing(
  p_briefing_id uuid,
  p_reopen_note text
)
returns table (
  project_id uuid,
  revision_id uuid,
  revision_number integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company_id uuid;
  v_project_id uuid;
  v_active_revision_id uuid;
  v_plan text;
  v_revision_count integer;
  v_next_revision integer;
  v_schema_version integer;
  v_schema_snapshot jsonb;
  v_answers jsonb;
  v_new_revision_id uuid := gen_random_uuid();
begin
  if p_reopen_note is not null and char_length(p_reopen_note) > 1000 then
    raise exception 'invalid_reopen_note' using errcode = '22023';
  end if;

  select
    briefing.company_id,
    briefing.project_id,
    briefing.active_revision_id,
    company_row.plan
  into
    v_company_id,
    v_project_id,
    v_active_revision_id,
    v_plan
  from public.project_briefings briefing
  join public.companies company_row on company_row.id = briefing.company_id
  where briefing.id = p_briefing_id
    and briefing.status in ('submitted', 'reviewed')
    and briefing.archived_at is null
    and exists (
      select 1
      from public.company_members membership
      where membership.company_id = briefing.company_id
        and membership.user_id = auth.uid()
    )
  for update of company_row, briefing;

  if not found or v_active_revision_id is null then
    raise exception 'briefing_not_ready_to_reopen' using errcode = '55000';
  end if;

  select
    revision_row.schema_version,
    revision_row.schema_snapshot,
    revision_row.answers
  into
    v_schema_version,
    v_schema_snapshot,
    v_answers
  from public.project_briefing_revisions revision_row
  where revision_row.id = v_active_revision_id
    and revision_row.submitted_at is not null
  for share;

  if not found then
    raise exception 'submitted_briefing_revision_not_found'
      using errcode = '55000';
  end if;

  select count(*), coalesce(max(revision_row.revision_number), 0) + 1
  into v_revision_count, v_next_revision
  from public.project_briefing_revisions revision_row
  where revision_row.briefing_id = p_briefing_id;

  if v_revision_count >= public.project_briefing_revision_limit(v_plan) then
    raise exception 'project_briefing_revision_limit_reached'
      using errcode = 'P0001';
  end if;

  insert into public.project_briefing_revisions (
    id,
    company_id,
    project_id,
    briefing_id,
    revision_number,
    schema_version,
    schema_snapshot,
    answers,
    reopen_note
  ) values (
    v_new_revision_id,
    v_company_id,
    v_project_id,
    p_briefing_id,
    v_next_revision,
    v_schema_version,
    v_schema_snapshot,
    v_answers,
    nullif(btrim(coalesce(p_reopen_note, '')), '')
  );

  update public.project_briefings
  set
    status = 'shared',
    active_revision_id = v_new_revision_id,
    shared_at = now(),
    reviewed_at = null
  where id = p_briefing_id;

  project_id := v_project_id;
  revision_id := v_new_revision_id;
  revision_number := v_next_revision;
  return next;
end;
$$;

create or replace function public.archive_project_briefing(
  p_briefing_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_id uuid;
begin
  select briefing.project_id
  into v_project_id
  from public.project_briefings briefing
  where briefing.id = p_briefing_id
    and briefing.archived_at is null
    and exists (
      select 1
      from public.company_members membership
      where membership.company_id = briefing.company_id
        and membership.user_id = auth.uid()
    )
  for update;

  if not found then
    raise exception 'briefing_not_found' using errcode = '42501';
  end if;

  update public.project_briefings
  set
    status = 'archived',
    archived_at = now()
  where id = p_briefing_id;

  return v_project_id;
end;
$$;

create or replace function public.save_public_project_briefing(
  p_share_token text,
  p_revision_id uuid,
  p_answers jsonb,
  p_expected_edit_version bigint
)
returns table (
  edit_version bigint,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_edit_version bigint;
begin
  if p_share_token is null
    or p_share_token !~ '^[A-Za-z0-9_-]{32,}$'
    or char_length(p_share_token) > 256
    or p_answers is null
    or jsonb_typeof(p_answers) <> 'object'
    or octet_length(p_answers::text) > 65536
    or p_expected_edit_version is null
    or p_expected_edit_version < 0 then
    raise exception 'invalid_public_briefing_request' using errcode = '22023';
  end if;

  select revision_row.edit_version
  into v_current_edit_version
  from public.project_briefing_revisions revision_row
  join public.project_briefings briefing
    on briefing.id = revision_row.briefing_id
  join public.quotes quote_row
    on quote_row.project_id = briefing.project_id
  where revision_row.id = p_revision_id
    and briefing.active_revision_id = revision_row.id
    and briefing.status = 'shared'
    and briefing.archived_at is null
    and revision_row.submitted_at is null
    and quote_row.share_token = p_share_token
    and quote_row.status = 'approved'
  for update of revision_row;

  if not found then
    raise exception 'public_briefing_not_found' using errcode = '42501';
  end if;

  if v_current_edit_version <> p_expected_edit_version then
    raise exception 'public_briefing_edit_conflict' using errcode = '40001';
  end if;

  update public.project_briefing_revisions
  set
    answers = p_answers,
    edit_version = edit_version + 1
  where id = p_revision_id
  returning
    project_briefing_revisions.edit_version,
    project_briefing_revisions.updated_at
  into edit_version, updated_at;

  return next;
end;
$$;

create or replace function public.submit_public_project_briefing(
  p_share_token text,
  p_revision_id uuid,
  p_answers jsonb,
  p_expected_edit_version bigint,
  p_respondent_name text
)
returns table (
  edit_version bigint,
  submitted_at timestamptz,
  created boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_briefing_id uuid;
  v_current_edit_version bigint;
  v_existing_submitted_at timestamptz;
  v_now timestamptz := now();
begin
  if p_share_token is null
    or p_share_token !~ '^[A-Za-z0-9_-]{32,}$'
    or char_length(p_share_token) > 256
    or p_answers is null
    or jsonb_typeof(p_answers) <> 'object'
    or octet_length(p_answers::text) > 65536
    or p_expected_edit_version is null
    or p_expected_edit_version < 0
    or char_length(btrim(coalesce(p_respondent_name, ''))) not between 2 and 120
  then
    raise exception 'invalid_public_briefing_submission'
      using errcode = '22023';
  end if;

  select
    briefing.id,
    revision_row.edit_version,
    revision_row.submitted_at
  into
    v_briefing_id,
    v_current_edit_version,
    v_existing_submitted_at
  from public.project_briefing_revisions revision_row
  join public.project_briefings briefing
    on briefing.id = revision_row.briefing_id
  join public.quotes quote_row
    on quote_row.project_id = briefing.project_id
  where revision_row.id = p_revision_id
    and briefing.active_revision_id = revision_row.id
    and briefing.archived_at is null
    and quote_row.share_token = p_share_token
    and quote_row.status = 'approved'
  for update of briefing, revision_row;

  if not found then
    raise exception 'public_briefing_not_found' using errcode = '42501';
  end if;

  if v_existing_submitted_at is not null then
    edit_version := v_current_edit_version;
    submitted_at := v_existing_submitted_at;
    created := false;
    return next;
    return;
  end if;

  if v_current_edit_version <> p_expected_edit_version then
    raise exception 'public_briefing_edit_conflict' using errcode = '40001';
  end if;

  update public.project_briefing_revisions
  set
    answers = p_answers,
    respondent_name = btrim(p_respondent_name),
    submitted_at = v_now,
    edit_version = edit_version + 1
  where id = p_revision_id
  returning project_briefing_revisions.edit_version
  into edit_version;

  update public.project_briefings
  set status = 'submitted'
  where id = v_briefing_id;

  submitted_at := v_now;
  created := true;
  return next;
end;
$$;

revoke all
  on table public.project_briefings,
    public.project_briefing_revisions,
    public.project_spaces,
    public.project_space_requirements
  from anon;

revoke insert, update, delete
  on table public.project_briefings,
    public.project_briefing_revisions
  from authenticated;

grant select
  on table public.project_briefings,
    public.project_briefing_revisions,
    public.project_spaces,
    public.project_space_requirements
  to authenticated;

grant insert, update, delete
  on table public.project_spaces,
    public.project_space_requirements
  to authenticated;

grant all privileges
  on table public.project_briefings,
    public.project_briefing_revisions,
    public.project_spaces,
    public.project_space_requirements
  to service_role;

revoke all on function public.tg_project_briefing_scope()
  from public, anon, authenticated;
revoke all on function public.tg_project_briefing_revision_scope()
  from public, anon, authenticated;
revoke all on function public.tg_guard_submitted_briefing_revision()
  from public, anon, authenticated;
revoke all on function public.tg_project_space_scope()
  from public, anon, authenticated;
revoke all on function public.tg_project_space_requirement_scope()
  from public, anon, authenticated;
revoke all on function public.tg_enforce_project_space_limit()
  from public, anon, authenticated;
revoke all on function public.project_briefing_active_limit(text)
  from public, anon, authenticated;
revoke all on function public.project_briefing_revision_limit(text)
  from public, anon, authenticated;
revoke all on function public.project_space_active_limit(text)
  from public, anon, authenticated;

revoke all on function public.create_project_briefing(
  uuid,
  text,
  integer,
  jsonb
) from public, anon;
grant execute on function public.create_project_briefing(
  uuid,
  text,
  integer,
  jsonb
) to authenticated, service_role;

revoke all on function public.share_project_briefing(uuid)
  from public, anon;
grant execute on function public.share_project_briefing(uuid)
  to authenticated, service_role;

revoke all on function public.review_project_briefing(uuid, text)
  from public, anon;
grant execute on function public.review_project_briefing(uuid, text)
  to authenticated, service_role;

revoke all on function public.reopen_project_briefing(uuid, text)
  from public, anon;
grant execute on function public.reopen_project_briefing(uuid, text)
  to authenticated, service_role;

revoke all on function public.archive_project_briefing(uuid)
  from public, anon;
grant execute on function public.archive_project_briefing(uuid)
  to authenticated, service_role;

revoke all on function public.save_public_project_briefing(
  text,
  uuid,
  jsonb,
  bigint
) from public, anon, authenticated;
grant execute on function public.save_public_project_briefing(
  text,
  uuid,
  jsonb,
  bigint
) to service_role;

revoke all on function public.submit_public_project_briefing(
  text,
  uuid,
  jsonb,
  bigint,
  text
) from public, anon, authenticated;
grant execute on function public.submit_public_project_briefing(
  text,
  uuid,
  jsonb,
  bigint,
  text
) to service_role;

grant execute on function public.project_briefing_active_limit(text)
  to service_role;
grant execute on function public.project_briefing_revision_limit(text)
  to service_role;
grant execute on function public.project_space_active_limit(text)
  to service_role;

comment on table public.project_briefings is
  'One active, versioned client briefing per project.';
comment on table public.project_briefing_revisions is
  'Snapshot and answers for each briefing round. Submitted rows are immutable.';
comment on table public.project_spaces is
  'Architecture and interiors program of spaces for a project.';
comment on table public.project_space_requirements is
  'Needs, constraints and preferences linked to one project space.';
