-- Goal-driven activation and an atomic path for work contracted outside Prumo.

alter table public.companies
  add column if not exists activation_goal text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'companies_activation_goal_chk'
      and conrelid = 'public.companies'::regclass
  ) then
    alter table public.companies
      add constraint companies_activation_goal_chk
      check (
        activation_goal is null
        or activation_goal = 'sell'
        or activation_goal = 'existing_project'
        or (
          activation_goal = 'client_briefing'
          and business_segment in ('architecture', 'interiors')
        )
        or (
          activation_goal = 'deliverables'
          and business_segment = 'engineering'
        )
        or (
          activation_goal = 'execution_control'
          and business_segment = 'construction'
        )
      );
  end if;
end
$$;

comment on column public.companies.activation_goal is
  'Guides onboarding and next actions. It does not grant plan capabilities.';

create or replace function public.protect_company_activation_goal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.activation_goal is not distinct from old.activation_goal then
    return new;
  end if;

  if auth.uid() is not null and not exists (
    select 1
    from public.company_members as member
    where member.company_id = old.id
      and member.user_id = auth.uid()
      and member.role in ('owner', 'manager')
  ) then
    raise exception 'activation_goal_not_allowed' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.protect_company_activation_goal()
  from public, anon, authenticated;

drop trigger if exists companies_protect_activation_goal on public.companies;
create trigger companies_protect_activation_goal
before update of activation_goal on public.companies
for each row execute function public.protect_company_activation_goal();

alter table public.projects
  add column if not exists creation_source text;

alter table public.projects
  add column if not exists creation_key uuid;

alter table public.projects
  add column if not exists client_access_token text;

update public.projects as project
set creation_source = case
  when company.workspace_mode = 'demo' then 'demo'
  when exists (
    select 1
    from public.quotes as quote
    where quote.project_id = project.id
  ) then 'quote'
  else 'legacy'
end
from public.companies as company
where company.id = project.company_id
  and project.creation_source is null;

alter table public.projects
  alter column creation_source set default 'legacy';

alter table public.projects
  alter column creation_source set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'projects_creation_source_chk'
      and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects
      add constraint projects_creation_source_chk
      check (creation_source in ('quote', 'direct', 'demo', 'legacy'));
  end if;
end
$$;

create unique index if not exists projects_company_creation_key_uidx
  on public.projects(company_id, creation_key)
  where creation_key is not null;

create unique index if not exists projects_client_access_token_uidx
  on public.projects(client_access_token)
  where client_access_token is not null;

alter table public.projects
  drop constraint if exists projects_client_access_token_url_safe_chk;

alter table public.projects
  add constraint projects_client_access_token_url_safe_chk
  check (
    client_access_token is null
    or client_access_token ~ '^[A-Za-z0-9_-]{32,}$'
  );

comment on column public.projects.creation_source is
  'quote: approved in Prumo; direct: contracted elsewhere; demo: sample; legacy: unknown.';

comment on column public.projects.creation_key is
  'Idempotency key used by the atomic direct-project creation flow.';

comment on column public.projects.client_access_token is
  'URL-safe access token for the restricted public page of a direct project.';

create or replace function public.protect_project_creation_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.creation_source := 'quote';
    new.creation_key := null;
    new.client_access_token := null;
    return new;
  end if;

  if new.creation_source is distinct from old.creation_source
    or new.creation_key is distinct from old.creation_key
    or new.client_access_token is distinct from old.client_access_token then
    raise exception 'project_creation_fields_are_server_managed'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.protect_project_creation_fields()
  from public, anon, authenticated;

drop trigger if exists projects_protect_creation_fields on public.projects;
create trigger projects_protect_creation_fields
before insert or update of creation_source, creation_key, client_access_token
on public.projects
for each row execute function public.protect_project_creation_fields();

create or replace function public.generate_project_client_access_token()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_token text;
begin
  loop
    v_token := rtrim(
      translate(
        encode(extensions.gen_random_bytes(32), 'base64'),
        '+/',
        '-_'
      ),
      '='
    );

    exit when not exists (
      select 1
      from public.quotes
      where share_token = v_token
    ) and not exists (
      select 1
      from public.projects
      where client_access_token = v_token
    );
  end loop;

  return v_token;
end;
$$;

revoke all on function public.generate_project_client_access_token()
  from public, anon, authenticated, service_role;

create or replace function public.resolve_public_project_access(
  p_access_token text
)
returns table(project_id uuid, access_kind text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_quote_project_id uuid;
  v_direct_project_id uuid;
begin
  if p_access_token is null
    or p_access_token !~ '^[A-Za-z0-9_-]{32,}$'
    or char_length(p_access_token) > 256 then
    return;
  end if;

  select quote_row.project_id
    into v_quote_project_id
    from public.quotes as quote_row
   where quote_row.share_token = p_access_token
     and quote_row.status = 'approved'
     and quote_row.project_id is not null
   limit 1;

  select project_row.id
    into v_direct_project_id
    from public.projects as project_row
   where project_row.client_access_token = p_access_token
     and project_row.creation_source = 'direct'
   limit 1;

  if (v_quote_project_id is null) = (v_direct_project_id is null) then
    return;
  end if;

  if v_quote_project_id is not null then
    return query select v_quote_project_id, 'quote'::text;
  else
    return query select v_direct_project_id, 'project'::text;
  end if;
end;
$$;

revoke all on function public.resolve_public_project_access(text)
  from public, anon, authenticated, service_role;

create or replace function public.create_direct_project(
  p_company_id uuid,
  p_creation_key uuid,
  p_project_name text,
  p_project_status public.project_status,
  p_existing_customer_id uuid,
  p_customer_name text,
  p_customer_document text,
  p_customer_phone text,
  p_customer_email text,
  p_customer_address text,
  p_customer_city text,
  p_customer_state text,
  p_customer_zip_code text,
  p_project_description text,
  p_project_address text,
  p_starts_on date,
  p_ends_on date,
  p_budget_cents bigint,
  p_template_id uuid
)
returns table(created_project_id uuid, created_customer_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_customer_id uuid;
  v_customer_address text;
  v_project_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.company_members
    where company_id = p_company_id
      and user_id = v_user_id
  ) then
    raise exception 'company_not_available' using errcode = '42501';
  end if;

  if p_creation_key is null then
    raise exception 'creation_key_required' using errcode = '22023';
  end if;

  if nullif(btrim(p_project_name), '') is null
    or char_length(btrim(p_project_name)) > 200 then
    raise exception 'invalid_project_name' using errcode = '22023';
  end if;

  if p_project_status not in ('planning', 'in_progress') then
    raise exception 'invalid_project_status' using errcode = '22023';
  end if;

  if p_starts_on is not null
    and p_ends_on is not null
    and p_ends_on < p_starts_on then
    raise exception 'invalid_project_dates' using errcode = '22023';
  end if;

  if p_budget_cents is not null and p_budget_cents < 0 then
    raise exception 'invalid_project_budget' using errcode = '22023';
  end if;

  if char_length(coalesce(p_project_description, '')) > 5000
    or char_length(coalesce(p_project_address, '')) > 300
    or char_length(coalesce(p_customer_document, '')) > 18
    or char_length(coalesce(p_customer_phone, '')) > 30
    or char_length(coalesce(p_customer_email, '')) > 254
    or char_length(coalesce(p_customer_address, '')) > 300
    or char_length(coalesce(p_customer_city, '')) > 120
    or char_length(coalesce(p_customer_state, '')) > 2
    or char_length(coalesce(p_customer_zip_code, '')) > 20 then
    raise exception 'direct_project_fields_too_long' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      'prumo:direct-project:' || p_company_id::text || ':' || p_creation_key::text,
      0
    )
  );

  select project.id, project.customer_id
    into v_project_id, v_customer_id
    from public.projects as project
   where project.company_id = p_company_id
     and project.creation_key = p_creation_key
   limit 1;

  if v_project_id is not null then
    return query select v_project_id, v_customer_id;
    return;
  end if;

  if p_template_id is not null and not exists (
    select 1
    from public.stage_templates
    where id = p_template_id
      and (company_id is null or company_id = p_company_id)
  ) then
    raise exception 'template_not_available' using errcode = '42501';
  end if;

  if p_existing_customer_id is not null then
    select customer.id, customer.address
      into v_customer_id, v_customer_address
      from public.customers as customer
     where customer.id = p_existing_customer_id
       and customer.company_id = p_company_id;

    if v_customer_id is null then
      raise exception 'customer_not_available' using errcode = '42501';
    end if;
  else
    if nullif(btrim(p_customer_name), '') is null
      or char_length(btrim(p_customer_name)) > 200 then
      raise exception 'invalid_customer_name' using errcode = '22023';
    end if;

    insert into public.customers (
      company_id,
      name,
      document,
      phone,
      email,
      address,
      city,
      state,
      zip_code,
      created_by
    ) values (
      p_company_id,
      btrim(p_customer_name),
      nullif(btrim(p_customer_document), ''),
      nullif(btrim(p_customer_phone), ''),
      nullif(btrim(p_customer_email), ''),
      nullif(btrim(p_customer_address), ''),
      nullif(btrim(p_customer_city), ''),
      nullif(upper(btrim(p_customer_state)), ''),
      nullif(btrim(p_customer_zip_code), ''),
      v_user_id
    )
    returning id, address into v_customer_id, v_customer_address;
  end if;

  insert into public.projects (
    company_id,
    customer_id,
    name,
    description,
    address,
    status,
    starts_on,
    ends_on,
    budget_cents,
    creation_source,
    creation_key,
    client_access_token,
    created_by
  ) values (
    p_company_id,
    v_customer_id,
    btrim(p_project_name),
    nullif(btrim(p_project_description), ''),
    coalesce(
      nullif(btrim(p_project_address), ''),
      nullif(btrim(v_customer_address), ''),
      nullif(btrim(p_customer_address), '')
    ),
    p_project_status,
    p_starts_on,
    p_ends_on,
    p_budget_cents,
    'direct',
    p_creation_key,
    public.generate_project_client_access_token(),
    v_user_id
  )
  returning id into v_project_id;

  if p_template_id is not null then
    perform public.instantiate_template_stages(
      v_project_id,
      p_company_id,
      p_template_id
    );
  end if;

  return query select v_project_id, v_customer_id;
end;
$$;

revoke all on function public.create_direct_project(
  uuid,
  uuid,
  text,
  public.project_status,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  date,
  date,
  bigint,
  uuid
) from public;

revoke all on function public.create_direct_project(
  uuid,
  uuid,
  text,
  public.project_status,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  date,
  date,
  bigint,
  uuid
) from anon;

grant execute on function public.create_direct_project(
  uuid,
  uuid,
  text,
  public.project_status,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  date,
  date,
  bigint,
  uuid
) to authenticated;

create or replace function public.regenerate_project_client_access_token(
  p_project_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_token text;
begin
  if v_user_id is null or p_project_id is null then
    raise exception 'project_not_available' using errcode = '42501';
  end if;

  select project_row.company_id
    into v_company_id
    from public.projects as project_row
   where project_row.id = p_project_id
     and project_row.creation_source = 'direct';

  if v_company_id is null or not exists (
    select 1
    from public.company_members as member
    where member.company_id = v_company_id
      and member.user_id = v_user_id
      and member.role in ('owner', 'manager')
  ) then
    raise exception 'project_not_available' using errcode = '42501';
  end if;

  v_token := public.generate_project_client_access_token();

  update public.projects
     set client_access_token = v_token
   where id = p_project_id
     and company_id = v_company_id
     and creation_source = 'direct';

  return v_token;
end;
$$;

revoke all on function public.regenerate_project_client_access_token(uuid)
  from public, anon;

grant execute on function public.regenerate_project_client_access_token(uuid)
  to authenticated, service_role;

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
    from public.project_briefing_revisions as revision_row
    join public.project_briefings as briefing
      on briefing.id = revision_row.briefing_id
    join public.projects as project_row
      on project_row.id = briefing.project_id
    join public.resolve_public_project_access(p_share_token) as access_row
      on access_row.project_id = briefing.project_id
   where revision_row.id = p_revision_id
     and briefing.active_revision_id = revision_row.id
     and briefing.status = 'shared'
     and briefing.archived_at is null
     and revision_row.submitted_at is null
     and project_row.status not in ('completed', 'cancelled')
     and project_row.delivery_approved_at is null
   for update of revision_row;

  if not found then
    raise exception 'public_briefing_not_found' using errcode = '42501';
  end if;

  if v_current_edit_version <> p_expected_edit_version then
    raise exception 'public_briefing_edit_conflict' using errcode = '40001';
  end if;

  update public.project_briefing_revisions as revision_row
     set answers = p_answers,
         edit_version = revision_row.edit_version + 1
   where revision_row.id = p_revision_id
  returning revision_row.edit_version, revision_row.updated_at
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

  select briefing.id,
         revision_row.edit_version,
         revision_row.submitted_at
    into v_briefing_id,
         v_current_edit_version,
         v_existing_submitted_at
    from public.project_briefing_revisions as revision_row
    join public.project_briefings as briefing
      on briefing.id = revision_row.briefing_id
    join public.projects as project_row
      on project_row.id = briefing.project_id
    join public.resolve_public_project_access(p_share_token) as access_row
      on access_row.project_id = briefing.project_id
   where revision_row.id = p_revision_id
     and briefing.active_revision_id = revision_row.id
     and briefing.archived_at is null
     and (
       (
         briefing.status = 'shared'
         and revision_row.submitted_at is null
         and project_row.status not in ('completed', 'cancelled')
         and project_row.delivery_approved_at is null
       )
       or (
         briefing.status in ('submitted', 'reviewed')
         and revision_row.submitted_at is not null
       )
     )
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

  update public.project_briefing_revisions as revision_row
     set answers = p_answers,
         respondent_name = btrim(p_respondent_name),
         submitted_at = v_now,
         edit_version = revision_row.edit_version + 1
   where revision_row.id = p_revision_id
  returning revision_row.edit_version
       into edit_version;

  update public.project_briefings
     set status = 'submitted'
   where id = v_briefing_id;

  submitted_at := v_now;
  created := true;
  return next;
end;
$$;

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
