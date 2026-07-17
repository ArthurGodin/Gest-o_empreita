begin;

alter table public.catalog_items
  add column if not exists reference_source text,
  add column if not exists sinapi_entry_id uuid
    references public.sinapi_entries(id) on delete restrict,
  add column if not exists reference_code text,
  add column if not exists reference_kind public.sinapi_reference_kind,
  add column if not exists reference_uf text,
  add column if not exists reference_competence date,
  add column if not exists reference_revision smallint,
  add column if not exists reference_regime public.sinapi_regime,
  add column if not exists reference_description text,
  add column if not exists reference_unit text,
  add column if not exists reference_cost_cents bigint,
  add column if not exists reference_adjustment_basis_points integer,
  add column if not exists reference_release_sha256 text;

alter table public.quote_items
  add column if not exists reference_source text,
  add column if not exists sinapi_entry_id uuid
    references public.sinapi_entries(id) on delete restrict,
  add column if not exists reference_code text,
  add column if not exists reference_kind public.sinapi_reference_kind,
  add column if not exists reference_uf text,
  add column if not exists reference_competence date,
  add column if not exists reference_revision smallint,
  add column if not exists reference_regime public.sinapi_regime,
  add column if not exists reference_description text,
  add column if not exists reference_unit text,
  add column if not exists reference_cost_cents bigint,
  add column if not exists reference_adjustment_basis_points integer,
  add column if not exists reference_release_sha256 text;

alter table public.catalog_items
  add constraint catalog_items_reference_complete_chk check (
    (
      reference_source is null
      and num_nonnulls(
        sinapi_entry_id,
        reference_code,
        reference_kind,
        reference_uf,
        reference_competence,
        reference_revision,
        reference_regime,
        reference_description,
        reference_unit,
        reference_cost_cents,
        reference_adjustment_basis_points,
        reference_release_sha256
      ) = 0
    )
    or (
      reference_source = 'sinapi'
      and num_nonnulls(
        sinapi_entry_id,
        reference_code,
        reference_kind,
        reference_uf,
        reference_competence,
        reference_revision,
        reference_regime,
        reference_description,
        reference_unit,
        reference_cost_cents,
        reference_adjustment_basis_points,
        reference_release_sha256
      ) = 12
    )
  ),
  add constraint catalog_items_reference_values_chk check (
    reference_source is null
    or (
      reference_code <> ''
      and reference_uf ~ '^(AC|AL|AM|AP|BA|CE|DF|ES|GO|MA|MG|MS|MT|PA|PB|PE|PI|PR|RJ|RN|RO|RR|RS|SC|SE|SP|TO)$'
      and reference_competence = date_trunc('month', reference_competence)::date
      and reference_revision > 0
      and reference_description <> ''
      and reference_unit <> ''
      and reference_cost_cents >= 0
      and reference_adjustment_basis_points between 0 and 100000
      and reference_release_sha256 ~ '^[0-9a-f]{64}$'
    )
  );

alter table public.quote_items
  add constraint quote_items_reference_complete_chk check (
    (
      reference_source is null
      and num_nonnulls(
        sinapi_entry_id,
        reference_code,
        reference_kind,
        reference_uf,
        reference_competence,
        reference_revision,
        reference_regime,
        reference_description,
        reference_unit,
        reference_cost_cents,
        reference_adjustment_basis_points,
        reference_release_sha256
      ) = 0
    )
    or (
      reference_source = 'sinapi'
      and num_nonnulls(
        sinapi_entry_id,
        reference_code,
        reference_kind,
        reference_uf,
        reference_competence,
        reference_revision,
        reference_regime,
        reference_description,
        reference_unit,
        reference_cost_cents,
        reference_adjustment_basis_points,
        reference_release_sha256
      ) = 12
    )
  ),
  add constraint quote_items_reference_values_chk check (
    reference_source is null
    or (
      reference_code <> ''
      and reference_uf ~ '^(AC|AL|AM|AP|BA|CE|DF|ES|GO|MA|MG|MS|MT|PA|PB|PE|PI|PR|RJ|RN|RO|RR|RS|SC|SE|SP|TO)$'
      and reference_competence = date_trunc('month', reference_competence)::date
      and reference_revision > 0
      and reference_description <> ''
      and reference_unit <> ''
      and reference_cost_cents >= 0
      and reference_adjustment_basis_points between 0 and 100000
      and reference_release_sha256 ~ '^[0-9a-f]{64}$'
    )
  );

create index catalog_items_sinapi_entry_idx
  on public.catalog_items (sinapi_entry_id)
  where sinapi_entry_id is not null;

create index quote_items_sinapi_entry_idx
  on public.quote_items (sinapi_entry_id)
  where sinapi_entry_id is not null;

create or replace function public.tg_resolve_sinapi_snapshot()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_match record;
  v_uf text := upper(btrim(coalesce(new.reference_uf, '')));
begin
  if new.sinapi_entry_id is null then
    if num_nonnulls(
      new.reference_source,
      new.reference_code,
      new.reference_kind,
      new.reference_uf,
      new.reference_competence,
      new.reference_revision,
      new.reference_regime,
      new.reference_description,
      new.reference_unit,
      new.reference_cost_cents,
      new.reference_adjustment_basis_points,
      new.reference_release_sha256
    ) > 0 then
      raise exception 'partial SINAPI reference is not allowed'
        using errcode = '22023';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE'
    and new.company_id is not distinct from old.company_id
    and new.sinapi_entry_id is not distinct from old.sinapi_entry_id
    and new.reference_source is not distinct from old.reference_source
    and new.reference_code is not distinct from old.reference_code
    and new.reference_kind is not distinct from old.reference_kind
    and new.reference_uf is not distinct from old.reference_uf
    and new.reference_competence is not distinct from old.reference_competence
    and new.reference_revision is not distinct from old.reference_revision
    and new.reference_regime is not distinct from old.reference_regime
    and new.reference_description is not distinct from old.reference_description
    and new.reference_unit is not distinct from old.reference_unit
    and new.reference_cost_cents is not distinct from old.reference_cost_cents
    and new.reference_adjustment_basis_points is not distinct from old.reference_adjustment_basis_points
    and new.reference_release_sha256 is not distinct from old.reference_release_sha256
  then
    return new;
  end if;

  if v_uf !~ '^(AC|AL|AM|AP|BA|CE|DF|ES|GO|MA|MG|MS|MT|PA|PB|PE|PI|PR|RJ|RN|RO|RR|RS|SC|SE|SP|TO)$' then
    raise exception 'a valid UF is required for a SINAPI reference'
      using errcode = '22023';
  end if;

  if new.reference_adjustment_basis_points is null
    or new.reference_adjustment_basis_points not between 0 and 100000
  then
    raise exception 'SINAPI adjustment must be between 0 and 100000 basis points'
      using errcode = '22023';
  end if;

  if auth.uid() is not null and not exists (
    select 1
    from public.company_members membership
    where membership.company_id = new.company_id
      and membership.user_id = auth.uid()
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.companies company
    where company.id = new.company_id
      and company.plan = 'ultimate'
  ) then
    raise exception 'SINAPI requer o plano Ultimate'
      using errcode = 'P0001', detail = 'SINAPI_ULTIMATE_REQUIRED';
  end if;

  select
    entry.code,
    entry.kind,
    entry.regime,
    entry.description,
    entry.unit,
    entry.prices_cents,
    release.competence,
    release.revision,
    release.source_sha256
  into v_match
  from public.sinapi_entries entry
  join public.sinapi_releases release on release.id = entry.release_id
  where entry.id = new.sinapi_entry_id
    and release.status in ('published', 'superseded')
    and entry.prices_cents ? v_uf;

  if not found then
    raise exception 'published SINAPI reference or UF price not found'
      using errcode = 'P0002', detail = 'SINAPI_REFERENCE_NOT_FOUND';
  end if;

  new.reference_source := 'sinapi';
  new.reference_code := v_match.code;
  new.reference_kind := v_match.kind;
  new.reference_uf := v_uf;
  new.reference_competence := v_match.competence;
  new.reference_revision := v_match.revision;
  new.reference_regime := v_match.regime;
  new.reference_description := v_match.description;
  new.reference_unit := v_match.unit;
  new.reference_cost_cents := (v_match.prices_cents->>v_uf)::bigint;
  new.reference_release_sha256 := v_match.source_sha256;

  return new;
end;
$$;

create trigger catalog_items_resolve_sinapi_snapshot
  before insert or update on public.catalog_items
  for each row execute function public.tg_resolve_sinapi_snapshot();

create trigger quote_items_resolve_sinapi_snapshot
  before insert or update on public.quote_items
  for each row execute function public.tg_resolve_sinapi_snapshot();

create or replace function public.replace_quote_items(
  p_quote_id uuid,
  p_company_id uuid,
  p_title text,
  p_description text,
  p_customer_id uuid,
  p_valid_until date,
  p_notes text,
  p_items jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subtotal bigint := 0;
  v_item jsonb;
  v_total bigint;
begin
  if not exists (
    select 1
    from public.company_members
    where company_id = p_company_id
      and user_id = auth.uid()
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.quotes
    where id = p_quote_id
      and company_id = p_company_id
      and status = 'draft'
  ) then
    raise exception 'quote not editable' using errcode = '42501';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_total := round(
      (v_item->>'quantity')::numeric * (v_item->>'unit_price_cents')::numeric
    )::bigint;
    v_subtotal := v_subtotal + v_total;
  end loop;

  update public.quotes
  set
    title = p_title,
    description = p_description,
    customer_id = p_customer_id,
    valid_until = p_valid_until,
    notes = p_notes,
    subtotal_cents = v_subtotal,
    total_cents = v_subtotal,
    pdf_storage_path = null,
    pdf_generated_at = null
  where id = p_quote_id
    and company_id = p_company_id;

  delete from public.quote_items
  where quote_id = p_quote_id;

  if jsonb_array_length(p_items) > 0 then
    insert into public.quote_items (
      quote_id,
      company_id,
      position,
      description,
      unit,
      quantity,
      unit_price_cents,
      total_cents,
      sinapi_entry_id,
      reference_uf,
      reference_adjustment_basis_points
    )
    select
      p_quote_id,
      p_company_id,
      row_number() over () - 1,
      item->>'description',
      coalesce(nullif(item->>'unit', ''), 'un'),
      (item->>'quantity')::numeric,
      (item->>'unit_price_cents')::bigint,
      round(
        (item->>'quantity')::numeric * (item->>'unit_price_cents')::numeric
      )::bigint,
      nullif(item->>'sinapi_entry_id', '')::uuid,
      case
        when nullif(item->>'sinapi_entry_id', '') is null then null
        else upper(nullif(item->>'reference_uf', ''))
      end,
      case
        when nullif(item->>'sinapi_entry_id', '') is null then null
        else coalesce((item->>'reference_adjustment_basis_points')::integer, 0)
      end
    from jsonb_array_elements(p_items) item;
  end if;
end;
$$;

revoke execute on function public.tg_resolve_sinapi_snapshot()
  from public, anon, authenticated;
revoke execute on function public.replace_quote_items(
  uuid, uuid, text, text, uuid, date, text, jsonb
) from public, anon;

grant execute on function public.replace_quote_items(
  uuid, uuid, text, text, uuid, date, text, jsonb
) to authenticated, service_role;

commit;
