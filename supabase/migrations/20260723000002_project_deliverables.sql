-- Entregaveis versionados por projeto, com upload privado e revisao publica.
-- O fluxo e aditivo: projetos existentes e o aceite final legado continuam
-- funcionando sem exigir entregaveis.

do $$
begin
  create type public.project_deliverable_source_kind
    as enum ('file', 'external_link');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.project_deliverable_upload_state
    as enum ('pending', 'ready');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.project_deliverable_review_action
    as enum ('approved', 'changes_requested');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.project_deliverables (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  stage_id uuid references public.project_stages(id) on delete set null,
  title text not null,
  description text,
  position integer not null default 0,
  archived_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint project_deliverables_title_chk
    check (char_length(btrim(title)) between 1 and 160),
  constraint project_deliverables_description_chk
    check (description is null or char_length(description) <= 2000),
  constraint project_deliverables_position_chk
    check (position >= 0)
);

create index if not exists project_deliverables_project_idx
  on public.project_deliverables (project_id, position, created_at);

create index if not exists project_deliverables_company_active_idx
  on public.project_deliverables (company_id, project_id)
  where archived_at is null;

create table if not exists public.project_deliverable_versions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  deliverable_id uuid not null
    references public.project_deliverables(id) on delete cascade,
  version_number integer not null,
  source_kind public.project_deliverable_source_kind not null,
  upload_state public.project_deliverable_upload_state not null default 'pending',
  storage_path text,
  external_url text,
  file_name text,
  mime_type text,
  expected_size_bytes bigint,
  size_bytes bigint,
  change_note text,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint project_deliverable_versions_number_chk
    check (version_number > 0),
  constraint project_deliverable_versions_storage_path_chk
    check (
      storage_path is null
      or (
        char_length(storage_path) between 1 and 500
        and storage_path !~ '(^|/)\.\.(/|$)'
      )
    ),
  constraint project_deliverable_versions_external_url_chk
    check (
      external_url is null
      or (
        char_length(external_url) <= 2048
        and external_url ~ '^https://[^[:space:]]+$'
        and external_url !~ '^https://[^/]*@'
      )
    ),
  constraint project_deliverable_versions_file_name_chk
    check (
      file_name is null
      or (
        char_length(file_name) between 1 and 240
        and file_name !~ '[/\\]'
      )
    ),
  constraint project_deliverable_versions_mime_chk
    check (
      mime_type is null
      or mime_type in (
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp'
      )
    ),
  constraint project_deliverable_versions_expected_size_chk
    check (
      expected_size_bytes is null
      or expected_size_bytes between 1 and 15728640
    ),
  constraint project_deliverable_versions_size_chk
    check (
      size_bytes is null
      or size_bytes between 1 and 15728640
    ),
  constraint project_deliverable_versions_note_chk
    check (change_note is null or char_length(change_note) <= 1000),
  constraint project_deliverable_versions_source_chk
    check (
      (
        source_kind = 'file'
        and storage_path is not null
        and external_url is null
        and file_name is not null
        and mime_type is not null
        and expected_size_bytes is not null
        and (
          (upload_state = 'pending' and size_bytes is null)
          or (upload_state = 'ready' and size_bytes is not null)
        )
      )
      or
      (
        source_kind = 'external_link'
        and storage_path is null
        and external_url is not null
        and file_name is null
        and mime_type is null
        and expected_size_bytes is null
        and size_bytes is null
        and upload_state = 'ready'
      )
    ),
  constraint project_deliverable_versions_published_ready_chk
    check (published_at is null or upload_state = 'ready'),
  constraint project_deliverable_versions_number_uq
    unique (deliverable_id, version_number)
);

create unique index if not exists project_deliverable_versions_one_draft_uq
  on public.project_deliverable_versions (deliverable_id)
  where published_at is null;

create index if not exists project_deliverable_versions_project_idx
  on public.project_deliverable_versions (
    project_id,
    deliverable_id,
    version_number desc
  );

create index if not exists project_deliverable_versions_company_storage_idx
  on public.project_deliverable_versions (company_id)
  where source_kind = 'file';

create table if not exists public.project_deliverable_reviews (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  deliverable_id uuid not null
    references public.project_deliverables(id) on delete cascade,
  version_id uuid not null
    references public.project_deliverable_versions(id) on delete restrict,
  action public.project_deliverable_review_action not null,
  signer_name text not null,
  comment text,
  created_at timestamptz not null default now(),

  constraint project_deliverable_reviews_version_uq unique (version_id),
  constraint project_deliverable_reviews_signer_chk
    check (char_length(btrim(signer_name)) between 2 and 120),
  constraint project_deliverable_reviews_comment_chk
    check (
      (
        action = 'approved'
        and (comment is null or char_length(comment) <= 2000)
      )
      or
      (
        action = 'changes_requested'
        and char_length(btrim(comment)) between 10 and 2000
      )
    )
);

create index if not exists project_deliverable_reviews_project_idx
  on public.project_deliverable_reviews (project_id, created_at desc);

create table if not exists public.project_delivery_acceptances (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  signer_name text not null,
  accepted_at timestamptz not null default now(),
  share_token_fingerprint text not null,

  constraint project_delivery_acceptances_project_uq unique (project_id),
  constraint project_delivery_acceptances_signer_chk
    check (char_length(btrim(signer_name)) between 2 and 120),
  constraint project_delivery_acceptances_fingerprint_chk
    check (share_token_fingerprint ~ '^[a-f0-9]{64}$')
);

create index if not exists project_delivery_acceptances_company_idx
  on public.project_delivery_acceptances (company_id, accepted_at desc);

-- Scope guards keep denormalized company/project ids consistent even when a
-- service-role operation bypasses RLS.
create or replace function public.tg_project_deliverable_scope()
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
    raise exception 'deliverable_project_scope_mismatch'
      using errcode = '23514';
  end if;

  if new.stage_id is not null and not exists (
    select 1
    from public.project_stages stage_row
    where stage_row.id = new.stage_id
      and stage_row.project_id = new.project_id
      and stage_row.company_id = new.company_id
  ) then
    raise exception 'deliverable_stage_scope_mismatch'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function public.tg_project_deliverable_version_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.project_deliverables deliverable
    where deliverable.id = new.deliverable_id
      and deliverable.project_id = new.project_id
      and deliverable.company_id = new.company_id
  ) then
    raise exception 'deliverable_version_scope_mismatch'
      using errcode = '23514';
  end if;

  if new.source_kind = 'file' and new.storage_path not like (
    new.company_id::text || '/' || new.project_id::text || '/%'
  ) then
    raise exception 'deliverable_storage_scope_mismatch'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function public.tg_project_deliverable_review_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.project_deliverable_versions version_row
    where version_row.id = new.version_id
      and version_row.deliverable_id = new.deliverable_id
      and version_row.project_id = new.project_id
      and version_row.company_id = new.company_id
  ) then
    raise exception 'deliverable_review_scope_mismatch'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function public.tg_project_delivery_acceptance_scope()
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
    raise exception 'delivery_acceptance_scope_mismatch'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function public.tg_guard_published_deliverable_version()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return old;
  end if;

  if tg_op = 'DELETE' and old.published_at is not null then
    raise exception 'published_deliverable_version_is_immutable'
      using errcode = '55000';
  end if;

  if tg_op = 'UPDATE' and old.published_at is not null then
    raise exception 'published_deliverable_version_is_immutable'
      using errcode = '55000';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function public.tg_guard_immutable_deliverable_audit()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return old;
  end if;

  raise exception 'deliverable_audit_is_immutable'
    using errcode = '55000';
end;
$$;

drop trigger if exists project_deliverables_scope_guard
  on public.project_deliverables;
create trigger project_deliverables_scope_guard
  before insert or update on public.project_deliverables
  for each row execute function public.tg_project_deliverable_scope();

drop trigger if exists project_deliverables_set_updated_at
  on public.project_deliverables;
create trigger project_deliverables_set_updated_at
  before update on public.project_deliverables
  for each row execute function public.tg_set_updated_at();

drop trigger if exists project_deliverable_versions_scope_guard
  on public.project_deliverable_versions;
create trigger project_deliverable_versions_scope_guard
  before insert or update on public.project_deliverable_versions
  for each row execute function public.tg_project_deliverable_version_scope();

drop trigger if exists project_deliverable_versions_immutable_guard
  on public.project_deliverable_versions;
create trigger project_deliverable_versions_immutable_guard
  before update or delete on public.project_deliverable_versions
  for each row execute function public.tg_guard_published_deliverable_version();

drop trigger if exists project_deliverable_versions_set_updated_at
  on public.project_deliverable_versions;
create trigger project_deliverable_versions_set_updated_at
  before update on public.project_deliverable_versions
  for each row execute function public.tg_set_updated_at();

drop trigger if exists project_deliverable_reviews_scope_guard
  on public.project_deliverable_reviews;
create trigger project_deliverable_reviews_scope_guard
  before insert on public.project_deliverable_reviews
  for each row execute function public.tg_project_deliverable_review_scope();

drop trigger if exists project_deliverable_reviews_immutable_guard
  on public.project_deliverable_reviews;
create trigger project_deliverable_reviews_immutable_guard
  before update or delete on public.project_deliverable_reviews
  for each row execute function public.tg_guard_immutable_deliverable_audit();

drop trigger if exists project_delivery_acceptances_scope_guard
  on public.project_delivery_acceptances;
create trigger project_delivery_acceptances_scope_guard
  before insert on public.project_delivery_acceptances
  for each row execute function public.tg_project_delivery_acceptance_scope();

drop trigger if exists project_delivery_acceptances_immutable_guard
  on public.project_delivery_acceptances;
create trigger project_delivery_acceptances_immutable_guard
  before update or delete on public.project_delivery_acceptances
  for each row execute function public.tg_guard_immutable_deliverable_audit();

alter table public.project_deliverables enable row level security;
alter table public.project_deliverable_versions enable row level security;
alter table public.project_deliverable_reviews enable row level security;
alter table public.project_delivery_acceptances enable row level security;

create policy "tenant scoped - select"
  on public.project_deliverables
  for select to authenticated
  using (company_id in (select public.user_company_ids()));

create policy "tenant scoped - insert"
  on public.project_deliverables
  for insert to authenticated
  with check (company_id in (select public.user_company_ids()));

create policy "tenant scoped - update"
  on public.project_deliverables
  for update to authenticated
  using (company_id in (select public.user_company_ids()))
  with check (company_id in (select public.user_company_ids()));

create policy "tenant scoped - delete drafts"
  on public.project_deliverables
  for delete to authenticated
  using (
    company_id in (select public.user_company_ids())
    and not exists (
      select 1
      from public.project_deliverable_versions version_row
      where version_row.deliverable_id = project_deliverables.id
        and version_row.published_at is not null
    )
  );

create policy "tenant scoped - select"
  on public.project_deliverable_versions
  for select to authenticated
  using (company_id in (select public.user_company_ids()));

create policy "tenant scoped - insert drafts"
  on public.project_deliverable_versions
  for insert to authenticated
  with check (
    company_id in (select public.user_company_ids())
    and published_at is null
  );

create policy "tenant scoped - update drafts"
  on public.project_deliverable_versions
  for update to authenticated
  using (
    company_id in (select public.user_company_ids())
    and published_at is null
  )
  with check (
    company_id in (select public.user_company_ids())
    and published_at is null
  );

create policy "tenant scoped - delete drafts"
  on public.project_deliverable_versions
  for delete to authenticated
  using (
    company_id in (select public.user_company_ids())
    and published_at is null
  );

create policy "tenant scoped - select"
  on public.project_deliverable_reviews
  for select to authenticated
  using (company_id in (select public.user_company_ids()));

create policy "tenant scoped - select"
  on public.project_delivery_acceptances
  for select to authenticated
  using (company_id in (select public.user_company_ids()));

-- Limits are centralized in SQL so concurrent upload reservations cannot
-- bypass quotas enforced only in the interface.
create or replace function public.project_deliverable_count_limit(p_plan text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case
    when p_plan = 'ultimate' then 500
    when p_plan = 'pro' then 200
    else 3
  end
$$;

create or replace function public.project_deliverable_storage_limit(p_plan text)
returns bigint
language sql
immutable
set search_path = ''
as $$
  select case
    when p_plan = 'ultimate' then 5368709120::bigint
    when p_plan = 'pro' then 1073741824::bigint
    else 26214400::bigint
  end
$$;

create or replace function public.create_project_deliverable(
  p_project_id uuid,
  p_stage_id uuid,
  p_title text,
  p_description text,
  p_source_kind public.project_deliverable_source_kind,
  p_external_url text,
  p_file_name text,
  p_mime_type text,
  p_expected_size_bytes bigint,
  p_change_note text
)
returns table (
  deliverable_id uuid,
  version_id uuid,
  version_number integer,
  storage_path text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company_id uuid;
  v_plan text;
  v_project_status public.project_status;
  v_delivery_approved_at timestamptz;
  v_active_count integer;
  v_storage_used bigint;
  v_deliverable_id uuid := gen_random_uuid();
  v_version_id uuid := gen_random_uuid();
  v_position integer;
  v_extension text;
  v_storage_path text;
begin
  select
    project_row.company_id,
    company_row.plan,
    project_row.status,
    project_row.delivery_approved_at
  into
    v_company_id,
    v_plan,
    v_project_status,
    v_delivery_approved_at
  from public.projects project_row
  join public.companies company_row on company_row.id = project_row.company_id
  where project_row.id = p_project_id
    and exists (
      select 1
      from public.company_members membership
      where membership.company_id = project_row.company_id
        and membership.user_id = auth.uid()
    )
  for update of company_row;

  if not found then
    raise exception 'project_not_found' using errcode = '42501';
  end if;

  if v_project_status = 'cancelled' or v_delivery_approved_at is not null then
    raise exception 'project_deliverables_locked' using errcode = '55000';
  end if;

  if char_length(btrim(coalesce(p_title, ''))) not between 1 and 160 then
    raise exception 'invalid_deliverable_title' using errcode = '22023';
  end if;

  if p_description is not null and char_length(p_description) > 2000 then
    raise exception 'invalid_deliverable_description' using errcode = '22023';
  end if;

  if p_change_note is not null and char_length(p_change_note) > 1000 then
    raise exception 'invalid_deliverable_note' using errcode = '22023';
  end if;

  if p_stage_id is not null and not exists (
    select 1
    from public.project_stages stage_row
    where stage_row.id = p_stage_id
      and stage_row.project_id = p_project_id
      and stage_row.company_id = v_company_id
  ) then
    raise exception 'stage_not_found' using errcode = '42501';
  end if;

  select count(*)
  into v_active_count
  from public.project_deliverables deliverable
  where deliverable.project_id = p_project_id
    and deliverable.archived_at is null;

  if v_active_count >= public.project_deliverable_count_limit(v_plan) then
    raise exception 'deliverable_limit_reached' using errcode = 'P0001';
  end if;

  if p_source_kind = 'file' then
    if p_mime_type not in (
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp'
    ) then
      raise exception 'invalid_deliverable_mime' using errcode = '22023';
    end if;

    if p_expected_size_bytes is null
      or p_expected_size_bytes not between 1 and 15728640 then
      raise exception 'invalid_deliverable_size' using errcode = '22023';
    end if;

    if char_length(btrim(coalesce(p_file_name, ''))) not between 1 and 240
      or p_file_name ~ '[/\\]' then
      raise exception 'invalid_deliverable_file_name' using errcode = '22023';
    end if;

    select coalesce(
      sum(coalesce(version_row.size_bytes, version_row.expected_size_bytes)),
      0
    )
    into v_storage_used
    from public.project_deliverable_versions version_row
    where version_row.company_id = v_company_id
      and version_row.source_kind = 'file';

    if v_storage_used + p_expected_size_bytes
      > public.project_deliverable_storage_limit(v_plan) then
      raise exception 'deliverable_storage_quota_reached' using errcode = 'P0001';
    end if;

    v_extension := case p_mime_type
      when 'application/pdf' then 'pdf'
      when 'image/jpeg' then 'jpg'
      when 'image/png' then 'png'
      when 'image/webp' then 'webp'
    end;
    v_storage_path :=
      v_company_id::text || '/' ||
      p_project_id::text || '/' ||
      v_deliverable_id::text || '/' ||
      v_version_id::text || '.' || v_extension;
  else
    if p_external_url is null
      or char_length(p_external_url) > 2048
      or p_external_url !~ '^https://[^[:space:]]+$'
      or p_external_url ~ '^https://[^/]*@' then
      raise exception 'invalid_deliverable_url' using errcode = '22023';
    end if;
  end if;

  select coalesce(max(deliverable.position), -1) + 1
  into v_position
  from public.project_deliverables deliverable
  where deliverable.project_id = p_project_id;

  insert into public.project_deliverables (
    id,
    company_id,
    project_id,
    stage_id,
    title,
    description,
    position,
    created_by
  ) values (
    v_deliverable_id,
    v_company_id,
    p_project_id,
    p_stage_id,
    btrim(p_title),
    nullif(btrim(coalesce(p_description, '')), ''),
    v_position,
    auth.uid()
  );

  insert into public.project_deliverable_versions (
    id,
    company_id,
    project_id,
    deliverable_id,
    version_number,
    source_kind,
    upload_state,
    storage_path,
    external_url,
    file_name,
    mime_type,
    expected_size_bytes,
    change_note,
    created_by
  ) values (
    v_version_id,
    v_company_id,
    p_project_id,
    v_deliverable_id,
    1,
    p_source_kind,
    case
      when p_source_kind = 'file'
        then 'pending'::public.project_deliverable_upload_state
      else 'ready'::public.project_deliverable_upload_state
    end,
    v_storage_path,
    case when p_source_kind = 'external_link' then p_external_url else null end,
    case when p_source_kind = 'file' then btrim(p_file_name) else null end,
    case when p_source_kind = 'file' then p_mime_type else null end,
    case when p_source_kind = 'file' then p_expected_size_bytes else null end,
    nullif(btrim(coalesce(p_change_note, '')), ''),
    auth.uid()
  );

  deliverable_id := v_deliverable_id;
  version_id := v_version_id;
  version_number := 1;
  storage_path := v_storage_path;
  return next;
end;
$$;

create or replace function public.create_project_deliverable_version(
  p_deliverable_id uuid,
  p_source_kind public.project_deliverable_source_kind,
  p_external_url text,
  p_file_name text,
  p_mime_type text,
  p_expected_size_bytes bigint,
  p_change_note text
)
returns table (
  deliverable_id uuid,
  version_id uuid,
  version_number integer,
  storage_path text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company_id uuid;
  v_project_id uuid;
  v_plan text;
  v_project_status public.project_status;
  v_delivery_approved_at timestamptz;
  v_storage_used bigint;
  v_version_id uuid := gen_random_uuid();
  v_version_number integer;
  v_extension text;
  v_storage_path text;
begin
  select
    deliverable.company_id,
    deliverable.project_id,
    company_row.plan,
    project_row.status,
    project_row.delivery_approved_at
  into
    v_company_id,
    v_project_id,
    v_plan,
    v_project_status,
    v_delivery_approved_at
  from public.project_deliverables deliverable
  join public.projects project_row on project_row.id = deliverable.project_id
  join public.companies company_row on company_row.id = deliverable.company_id
  where deliverable.id = p_deliverable_id
    and deliverable.archived_at is null
    and exists (
      select 1
      from public.company_members membership
      where membership.company_id = deliverable.company_id
        and membership.user_id = auth.uid()
    )
  for update of company_row, deliverable;

  if not found then
    raise exception 'deliverable_not_found' using errcode = '42501';
  end if;

  if v_project_status = 'cancelled' or v_delivery_approved_at is not null then
    raise exception 'project_deliverables_locked' using errcode = '55000';
  end if;

  if exists (
    select 1
    from public.project_deliverable_versions version_row
    where version_row.deliverable_id = p_deliverable_id
      and version_row.published_at is null
  ) then
    raise exception 'deliverable_draft_exists' using errcode = '23505';
  end if;

  if not exists (
    select 1
    from public.project_deliverable_versions version_row
    where version_row.deliverable_id = p_deliverable_id
      and version_row.published_at is not null
  ) then
    raise exception 'deliverable_has_no_published_version' using errcode = '55000';
  end if;

  if p_change_note is not null and char_length(p_change_note) > 1000 then
    raise exception 'invalid_deliverable_note' using errcode = '22023';
  end if;

  select coalesce(max(version_row.version_number), 0) + 1
  into v_version_number
  from public.project_deliverable_versions version_row
  where version_row.deliverable_id = p_deliverable_id;

  if p_source_kind = 'file' then
    if p_mime_type not in (
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp'
    ) then
      raise exception 'invalid_deliverable_mime' using errcode = '22023';
    end if;

    if p_expected_size_bytes is null
      or p_expected_size_bytes not between 1 and 15728640 then
      raise exception 'invalid_deliverable_size' using errcode = '22023';
    end if;

    if char_length(btrim(coalesce(p_file_name, ''))) not between 1 and 240
      or p_file_name ~ '[/\\]' then
      raise exception 'invalid_deliverable_file_name' using errcode = '22023';
    end if;

    select coalesce(
      sum(coalesce(version_row.size_bytes, version_row.expected_size_bytes)),
      0
    )
    into v_storage_used
    from public.project_deliverable_versions version_row
    where version_row.company_id = v_company_id
      and version_row.source_kind = 'file';

    if v_storage_used + p_expected_size_bytes
      > public.project_deliverable_storage_limit(v_plan) then
      raise exception 'deliverable_storage_quota_reached' using errcode = 'P0001';
    end if;

    v_extension := case p_mime_type
      when 'application/pdf' then 'pdf'
      when 'image/jpeg' then 'jpg'
      when 'image/png' then 'png'
      when 'image/webp' then 'webp'
    end;
    v_storage_path :=
      v_company_id::text || '/' ||
      v_project_id::text || '/' ||
      p_deliverable_id::text || '/' ||
      v_version_id::text || '.' || v_extension;
  else
    if p_external_url is null
      or char_length(p_external_url) > 2048
      or p_external_url !~ '^https://[^[:space:]]+$'
      or p_external_url ~ '^https://[^/]*@' then
      raise exception 'invalid_deliverable_url' using errcode = '22023';
    end if;
  end if;

  insert into public.project_deliverable_versions (
    id,
    company_id,
    project_id,
    deliverable_id,
    version_number,
    source_kind,
    upload_state,
    storage_path,
    external_url,
    file_name,
    mime_type,
    expected_size_bytes,
    change_note,
    created_by
  ) values (
    v_version_id,
    v_company_id,
    v_project_id,
    p_deliverable_id,
    v_version_number,
    p_source_kind,
    case
      when p_source_kind = 'file'
        then 'pending'::public.project_deliverable_upload_state
      else 'ready'::public.project_deliverable_upload_state
    end,
    v_storage_path,
    case when p_source_kind = 'external_link' then p_external_url else null end,
    case when p_source_kind = 'file' then btrim(p_file_name) else null end,
    case when p_source_kind = 'file' then p_mime_type else null end,
    case when p_source_kind = 'file' then p_expected_size_bytes else null end,
    nullif(btrim(coalesce(p_change_note, '')), ''),
    auth.uid()
  );

  deliverable_id := p_deliverable_id;
  version_id := v_version_id;
  version_number := v_version_number;
  storage_path := v_storage_path;
  return next;
end;
$$;

create or replace function public.finalize_project_deliverable_upload(
  p_version_id uuid,
  p_size_bytes bigint,
  p_mime_type text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version public.project_deliverable_versions%rowtype;
begin
  select version_row.*
  into v_version
  from public.project_deliverable_versions version_row
  where version_row.id = p_version_id
    and version_row.company_id in (
      select public.user_company_ids()
    )
  for update;

  if not found then
    raise exception 'deliverable_version_not_found' using errcode = '42501';
  end if;

  if v_version.source_kind <> 'file' or v_version.published_at is not null then
    raise exception 'deliverable_upload_not_finalizable' using errcode = '55000';
  end if;

  if v_version.upload_state = 'ready' then
    return (
      v_version.size_bytes = p_size_bytes
      and v_version.mime_type = p_mime_type
    );
  end if;

  if p_size_bytes <> v_version.expected_size_bytes
    or p_size_bytes not between 1 and 15728640
    or p_mime_type <> v_version.mime_type then
    raise exception 'deliverable_upload_metadata_mismatch'
      using errcode = '22023';
  end if;

  update public.project_deliverable_versions
  set
    upload_state = 'ready',
    size_bytes = p_size_bytes
  where id = p_version_id;

  return true;
end;
$$;

create or replace function public.publish_project_deliverable_version(
  p_deliverable_id uuid,
  p_version_id uuid
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_id uuid;
  v_company_id uuid;
  v_project_status public.project_status;
  v_delivery_approved_at timestamptz;
  v_version public.project_deliverable_versions%rowtype;
  v_previous_version_id uuid;
  v_published_at timestamptz;
begin
  select
    deliverable.project_id,
    deliverable.company_id,
    project_row.status,
    project_row.delivery_approved_at
  into
    v_project_id,
    v_company_id,
    v_project_status,
    v_delivery_approved_at
  from public.project_deliverables deliverable
  join public.projects project_row on project_row.id = deliverable.project_id
  where deliverable.id = p_deliverable_id
    and deliverable.archived_at is null
    and exists (
      select 1
      from public.company_members membership
      where membership.company_id = deliverable.company_id
        and membership.user_id = auth.uid()
    )
  for update of deliverable;

  if not found then
    raise exception 'deliverable_not_found' using errcode = '42501';
  end if;

  if v_project_status = 'cancelled' or v_delivery_approved_at is not null then
    raise exception 'project_deliverables_locked' using errcode = '55000';
  end if;

  select version_row.*
  into v_version
  from public.project_deliverable_versions version_row
  where version_row.id = p_version_id
    and version_row.deliverable_id = p_deliverable_id
    and version_row.project_id = v_project_id
    and version_row.company_id = v_company_id
  for update;

  if not found then
    raise exception 'deliverable_version_not_found' using errcode = '42501';
  end if;

  if v_version.published_at is not null then
    return v_version.published_at;
  end if;

  if v_version.upload_state <> 'ready' then
    raise exception 'deliverable_upload_not_ready' using errcode = '55000';
  end if;

  select previous_version.id
  into v_previous_version_id
  from public.project_deliverable_versions previous_version
  where previous_version.deliverable_id = p_deliverable_id
    and previous_version.published_at is not null
  order by previous_version.version_number desc
  limit 1;

  if v_previous_version_id is not null and not exists (
    select 1
    from public.project_deliverable_reviews review_row
    where review_row.version_id = v_previous_version_id
  ) then
    raise exception 'deliverable_review_pending' using errcode = '55000';
  end if;

  v_published_at := now();

  update public.project_deliverable_versions
  set published_at = v_published_at
  where id = p_version_id;

  return v_published_at;
end;
$$;

create or replace function public.review_project_deliverable_version(
  p_share_token text,
  p_version_id uuid,
  p_action public.project_deliverable_review_action,
  p_signer_name text,
  p_comment text
)
returns table (
  review_id uuid,
  review_action public.project_deliverable_review_action,
  signer_name text,
  review_comment text,
  reviewed_at timestamptz,
  created boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_id uuid;
  v_company_id uuid;
  v_delivery_approved_at timestamptz;
  v_deliverable_id uuid;
  v_latest_version_id uuid;
  v_existing public.project_deliverable_reviews%rowtype;
  v_review_id uuid;
  v_reviewed_at timestamptz;
begin
  if p_share_token is null
    or p_share_token !~ '^[A-Za-z0-9_-]{32,}$'
    or char_length(p_share_token) > 256 then
    raise exception 'public_link_not_found' using errcode = '42501';
  end if;

  select
    quote_row.project_id,
    quote_row.company_id,
    project_row.delivery_approved_at
  into
    v_project_id,
    v_company_id,
    v_delivery_approved_at
  from public.quotes quote_row
  join public.projects project_row on project_row.id = quote_row.project_id
  where quote_row.share_token = p_share_token
    and quote_row.project_id is not null
    and quote_row.status = 'approved'
  for update of project_row;

  if not found then
    raise exception 'public_link_not_found' using errcode = '42501';
  end if;

  if v_delivery_approved_at is not null then
    raise exception 'project_delivery_already_accepted' using errcode = '55000';
  end if;

  select version_row.deliverable_id
  into v_deliverable_id
  from public.project_deliverable_versions version_row
  join public.project_deliverables deliverable
    on deliverable.id = version_row.deliverable_id
  where version_row.id = p_version_id
    and version_row.project_id = v_project_id
    and version_row.company_id = v_company_id
    and version_row.published_at is not null
    and deliverable.archived_at is null
  for update of deliverable;

  if not found then
    raise exception 'deliverable_version_not_found' using errcode = '42501';
  end if;

  select version_row.id
  into v_latest_version_id
  from public.project_deliverable_versions version_row
  where version_row.deliverable_id = v_deliverable_id
    and version_row.published_at is not null
  order by version_row.version_number desc
  limit 1;

  if v_latest_version_id is distinct from p_version_id then
    raise exception 'deliverable_version_superseded' using errcode = '55000';
  end if;

  select review_row.*
  into v_existing
  from public.project_deliverable_reviews review_row
  where review_row.version_id = p_version_id;

  if found then
    review_id := v_existing.id;
    review_action := v_existing.action;
    signer_name := v_existing.signer_name;
    review_comment := v_existing.comment;
    reviewed_at := v_existing.created_at;
    created := false;
    return next;
    return;
  end if;

  if char_length(btrim(coalesce(p_signer_name, ''))) not between 2 and 120 then
    raise exception 'invalid_review_signer' using errcode = '22023';
  end if;

  if p_action = 'changes_requested' and
    char_length(btrim(coalesce(p_comment, ''))) not between 10 and 2000 then
    raise exception 'invalid_review_comment' using errcode = '22023';
  end if;

  if p_action = 'approved' and p_comment is not null
    and char_length(p_comment) > 2000 then
    raise exception 'invalid_review_comment' using errcode = '22023';
  end if;

  v_review_id := gen_random_uuid();
  v_reviewed_at := now();

  insert into public.project_deliverable_reviews (
    id,
    company_id,
    project_id,
    deliverable_id,
    version_id,
    action,
    signer_name,
    comment,
    created_at
  ) values (
    v_review_id,
    v_company_id,
    v_project_id,
    v_deliverable_id,
    p_version_id,
    p_action,
    btrim(p_signer_name),
    nullif(btrim(coalesce(p_comment, '')), ''),
    v_reviewed_at
  );

  review_id := v_review_id;
  review_action := p_action;
  signer_name := btrim(p_signer_name);
  review_comment := nullif(btrim(coalesce(p_comment, '')), '');
  reviewed_at := v_reviewed_at;
  created := true;
  return next;
end;
$$;

create or replace function public.record_project_delivery_acceptance(
  p_share_token text,
  p_signer_name text
)
returns table (
  acceptance_id uuid,
  project_id uuid,
  company_id uuid,
  accepted_at timestamptz,
  created boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_id uuid;
  v_company_id uuid;
  v_project_status public.project_status;
  v_legacy_accepted_at timestamptz;
  v_existing public.project_delivery_acceptances%rowtype;
  v_acceptance_id uuid;
  v_accepted_at timestamptz;
begin
  if p_share_token is null
    or p_share_token !~ '^[A-Za-z0-9_-]{32,}$'
    or char_length(p_share_token) > 256 then
    raise exception 'public_link_not_found' using errcode = '42501';
  end if;

  if char_length(btrim(coalesce(p_signer_name, ''))) not between 2 and 120 then
    raise exception 'invalid_delivery_signer' using errcode = '22023';
  end if;

  select
    quote_row.project_id,
    quote_row.company_id,
    project_row.status,
    project_row.delivery_approved_at
  into
    v_project_id,
    v_company_id,
    v_project_status,
    v_legacy_accepted_at
  from public.quotes quote_row
  join public.projects project_row on project_row.id = quote_row.project_id
  where quote_row.share_token = p_share_token
    and quote_row.project_id is not null
    and quote_row.status = 'approved'
  for update of project_row;

  if not found then
    raise exception 'public_link_not_found' using errcode = '42501';
  end if;

  select acceptance.*
  into v_existing
  from public.project_delivery_acceptances acceptance
  where acceptance.project_id = v_project_id;

  if found then
    acceptance_id := v_existing.id;
    project_id := v_existing.project_id;
    company_id := v_existing.company_id;
    accepted_at := v_existing.accepted_at;
    created := false;
    return next;
    return;
  end if;

  if v_project_status <> 'completed' then
    raise exception 'project_not_completed' using errcode = '55000';
  end if;

  if v_legacy_accepted_at is null and exists (
    select 1
    from public.project_deliverables deliverable
    join lateral (
      select version_row.id
      from public.project_deliverable_versions version_row
      where version_row.deliverable_id = deliverable.id
        and version_row.published_at is not null
      order by version_row.version_number desc
      limit 1
    ) latest_version on true
    left join public.project_deliverable_reviews review_row
      on review_row.version_id = latest_version.id
    where deliverable.project_id = v_project_id
      and deliverable.archived_at is null
      and (
        review_row.id is null
        or review_row.action <> 'approved'
      )
  ) then
    raise exception 'project_deliverables_pending' using errcode = '55000';
  end if;

  v_acceptance_id := gen_random_uuid();
  v_accepted_at := coalesce(v_legacy_accepted_at, now());

  insert into public.project_delivery_acceptances (
    id,
    company_id,
    project_id,
    signer_name,
    accepted_at,
    share_token_fingerprint
  ) values (
    v_acceptance_id,
    v_company_id,
    v_project_id,
    btrim(p_signer_name),
    v_accepted_at,
    pg_catalog.encode(
      extensions.digest(
        pg_catalog.convert_to(p_share_token, 'UTF8'),
        'sha256'
      ),
      'hex'
    )
  );

  if v_legacy_accepted_at is null then
    update public.projects
    set delivery_approved_at = v_accepted_at
    where id = v_project_id
      and delivery_approved_at is null;
  end if;

  acceptance_id := v_acceptance_id;
  project_id := v_project_id;
  company_id := v_company_id;
  accepted_at := v_accepted_at;
  created := true;
  return next;
end;
$$;

create or replace function public.update_project_deliverable(
  p_deliverable_id uuid,
  p_title text,
  p_description text,
  p_stage_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_id uuid;
  v_project_status public.project_status;
  v_delivery_approved_at timestamptz;
begin
  if char_length(btrim(coalesce(p_title, ''))) not between 1 and 160 then
    raise exception 'invalid_deliverable_title' using errcode = '22023';
  end if;

  if p_description is not null and char_length(p_description) > 2000 then
    raise exception 'invalid_deliverable_description' using errcode = '22023';
  end if;

  select
    deliverable.project_id,
    project_row.status,
    project_row.delivery_approved_at
  into
    v_project_id,
    v_project_status,
    v_delivery_approved_at
  from public.project_deliverables deliverable
  join public.projects project_row on project_row.id = deliverable.project_id
  where deliverable.id = p_deliverable_id
    and exists (
      select 1
      from public.company_members membership
      where membership.company_id = deliverable.company_id
        and membership.user_id = auth.uid()
    )
  for update of deliverable;

  if not found then
    raise exception 'deliverable_not_found' using errcode = '42501';
  end if;

  if v_project_status = 'cancelled' or v_delivery_approved_at is not null then
    raise exception 'project_deliverables_locked' using errcode = '55000';
  end if;

  update public.project_deliverables
  set
    title = btrim(p_title),
    description = nullif(btrim(coalesce(p_description, '')), ''),
    stage_id = p_stage_id
  where id = p_deliverable_id;

  return v_project_id;
end;
$$;

create or replace function public.set_project_deliverable_archived(
  p_deliverable_id uuid,
  p_archived boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_id uuid;
  v_plan text;
  v_project_status public.project_status;
  v_delivery_approved_at timestamptz;
  v_archived_at timestamptz;
  v_active_count integer;
begin
  select
    deliverable.project_id,
    company_row.plan,
    project_row.status,
    project_row.delivery_approved_at,
    deliverable.archived_at
  into
    v_project_id,
    v_plan,
    v_project_status,
    v_delivery_approved_at,
    v_archived_at
  from public.project_deliverables deliverable
  join public.projects project_row on project_row.id = deliverable.project_id
  join public.companies company_row on company_row.id = deliverable.company_id
  where deliverable.id = p_deliverable_id
    and exists (
      select 1
      from public.company_members membership
      where membership.company_id = deliverable.company_id
        and membership.user_id = auth.uid()
    )
  for update of company_row, deliverable;

  if not found then
    raise exception 'deliverable_not_found' using errcode = '42501';
  end if;

  if v_project_status = 'cancelled' or v_delivery_approved_at is not null then
    raise exception 'project_deliverables_locked' using errcode = '55000';
  end if;

  if not p_archived and v_archived_at is not null then
    select count(*)
    into v_active_count
    from public.project_deliverables deliverable
    where deliverable.project_id = v_project_id
      and deliverable.archived_at is null;

    if v_active_count >= public.project_deliverable_count_limit(v_plan) then
      raise exception 'deliverable_limit_reached' using errcode = 'P0001';
    end if;
  end if;

  update public.project_deliverables
  set archived_at = case
    when p_archived then coalesce(archived_at, now())
    else null
  end
  where id = p_deliverable_id;

  return v_project_id;
end;
$$;

create or replace function public.delete_project_deliverable_draft(
  p_deliverable_id uuid,
  p_version_id uuid
)
returns table (
  project_id uuid,
  deliverable_deleted boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_id uuid;
  v_project_status public.project_status;
  v_delivery_approved_at timestamptz;
begin
  select
    deliverable.project_id,
    project_row.status,
    project_row.delivery_approved_at
  into
    v_project_id,
    v_project_status,
    v_delivery_approved_at
  from public.project_deliverables deliverable
  join public.projects project_row on project_row.id = deliverable.project_id
  where deliverable.id = p_deliverable_id
    and exists (
      select 1
      from public.company_members membership
      where membership.company_id = deliverable.company_id
        and membership.user_id = auth.uid()
    )
  for update of deliverable;

  if not found then
    raise exception 'deliverable_not_found' using errcode = '42501';
  end if;

  if v_project_status = 'cancelled' or v_delivery_approved_at is not null then
    raise exception 'project_deliverables_locked' using errcode = '55000';
  end if;

  if not exists (
    select 1
    from public.project_deliverable_versions version_row
    where version_row.id = p_version_id
      and version_row.deliverable_id = p_deliverable_id
      and version_row.published_at is null
    for update
  ) then
    raise exception 'deliverable_draft_not_found' using errcode = '42501';
  end if;

  delete from public.project_deliverable_versions
  where id = p_version_id
    and deliverable_id = p_deliverable_id
    and published_at is null;

  deliverable_deleted := not exists (
    select 1
    from public.project_deliverable_versions version_row
    where version_row.deliverable_id = p_deliverable_id
  );

  if deliverable_deleted then
    delete from public.project_deliverables
    where id = p_deliverable_id;
  end if;

  project_id := v_project_id;
  return next;
end;
$$;

-- Private bucket. Signed upload and download URLs are issued server-side.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'project-deliverables',
  'project-deliverables',
  false,
  15728640,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- No storage.objects policy is created. Only service-role signed operations
-- can issue access to objects in this bucket.

revoke all
  on table public.project_deliverables,
    public.project_deliverable_versions,
    public.project_deliverable_reviews,
    public.project_delivery_acceptances
  from anon;
revoke insert, update, delete
  on table public.project_deliverables,
    public.project_deliverable_versions,
    public.project_deliverable_reviews,
    public.project_delivery_acceptances
  from authenticated;

grant select
  on table public.project_deliverables
  to authenticated;
grant select
  on table public.project_deliverable_versions
  to authenticated;
grant select
  on table public.project_deliverable_reviews
  to authenticated;
grant select
  on table public.project_delivery_acceptances
  to authenticated;

grant all privileges
  on table public.project_deliverables,
    public.project_deliverable_versions,
    public.project_deliverable_reviews,
    public.project_delivery_acceptances
  to service_role;

revoke all on function public.project_deliverable_count_limit(text)
  from public, anon, authenticated;
revoke all on function public.project_deliverable_storage_limit(text)
  from public, anon, authenticated;
revoke all on function public.tg_project_deliverable_scope()
  from public, anon, authenticated;
revoke all on function public.tg_project_deliverable_version_scope()
  from public, anon, authenticated;
revoke all on function public.tg_project_deliverable_review_scope()
  from public, anon, authenticated;
revoke all on function public.tg_project_delivery_acceptance_scope()
  from public, anon, authenticated;
revoke all on function public.tg_guard_published_deliverable_version()
  from public, anon, authenticated;
revoke all on function public.tg_guard_immutable_deliverable_audit()
  from public, anon, authenticated;

revoke all on function public.create_project_deliverable(
  uuid,
  uuid,
  text,
  text,
  public.project_deliverable_source_kind,
  text,
  text,
  text,
  bigint,
  text
) from public, anon;
grant execute on function public.create_project_deliverable(
  uuid,
  uuid,
  text,
  text,
  public.project_deliverable_source_kind,
  text,
  text,
  text,
  bigint,
  text
) to authenticated, service_role;

revoke all on function public.create_project_deliverable_version(
  uuid,
  public.project_deliverable_source_kind,
  text,
  text,
  text,
  bigint,
  text
) from public, anon;
grant execute on function public.create_project_deliverable_version(
  uuid,
  public.project_deliverable_source_kind,
  text,
  text,
  text,
  bigint,
  text
) to authenticated, service_role;

revoke all on function public.finalize_project_deliverable_upload(
  uuid,
  bigint,
  text
) from public, anon;
grant execute on function public.finalize_project_deliverable_upload(
  uuid,
  bigint,
  text
) to authenticated, service_role;

revoke all on function public.publish_project_deliverable_version(uuid, uuid)
  from public, anon;
grant execute on function public.publish_project_deliverable_version(uuid, uuid)
  to authenticated, service_role;

revoke all on function public.update_project_deliverable(
  uuid,
  text,
  text,
  uuid
) from public, anon;
grant execute on function public.update_project_deliverable(
  uuid,
  text,
  text,
  uuid
) to authenticated, service_role;

revoke all on function public.set_project_deliverable_archived(uuid, boolean)
  from public, anon;
grant execute on function public.set_project_deliverable_archived(uuid, boolean)
  to authenticated, service_role;

revoke all on function public.delete_project_deliverable_draft(uuid, uuid)
  from public, anon;
grant execute on function public.delete_project_deliverable_draft(uuid, uuid)
  to authenticated, service_role;

revoke all on function public.review_project_deliverable_version(
  text,
  uuid,
  public.project_deliverable_review_action,
  text,
  text
) from public, anon, authenticated;
grant execute on function public.review_project_deliverable_version(
  text,
  uuid,
  public.project_deliverable_review_action,
  text,
  text
) to service_role;

revoke all on function public.record_project_delivery_acceptance(text, text)
  from public, anon, authenticated;
grant execute on function public.record_project_delivery_acceptance(text, text)
  to service_role;

grant execute on function public.project_deliverable_count_limit(text)
  to service_role;
grant execute on function public.project_deliverable_storage_limit(text)
  to service_role;

comment on table public.project_deliverables is
  'Logical project deliverables. Published history lives in version rows.';
comment on table public.project_deliverable_versions is
  'Immutable after publication. File objects live in a private Storage bucket.';
comment on table public.project_deliverable_reviews is
  'One immutable client decision per published deliverable version.';
comment on table public.project_delivery_acceptances is
  'Auditable final project acceptance without persisting the raw share token.';
