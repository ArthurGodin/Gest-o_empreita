-- Qualifica a coluna edit_version para evitar colisao com os campos de
-- retorno homonimos das funcoes PL/pgSQL.

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
  join public.projects project_row
    on project_row.id = briefing.project_id
  join public.quotes quote_row
    on quote_row.project_id = briefing.project_id
  where revision_row.id = p_revision_id
    and briefing.active_revision_id = revision_row.id
    and briefing.status = 'shared'
    and briefing.archived_at is null
    and revision_row.submitted_at is null
    and project_row.status not in ('completed', 'cancelled')
    and project_row.delivery_approved_at is null
    and quote_row.share_token = p_share_token
    and quote_row.status = 'approved'
  for update of revision_row;

  if not found then
    raise exception 'public_briefing_not_found' using errcode = '42501';
  end if;

  if v_current_edit_version <> p_expected_edit_version then
    raise exception 'public_briefing_edit_conflict' using errcode = '40001';
  end if;

  update public.project_briefing_revisions as revision_row
  set
    answers = p_answers,
    edit_version = revision_row.edit_version + 1
  where revision_row.id = p_revision_id
  returning
    revision_row.edit_version,
    revision_row.updated_at
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
  join public.projects project_row
    on project_row.id = briefing.project_id
  join public.quotes quote_row
    on quote_row.project_id = briefing.project_id
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

  update public.project_briefing_revisions as revision_row
  set
    answers = p_answers,
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
