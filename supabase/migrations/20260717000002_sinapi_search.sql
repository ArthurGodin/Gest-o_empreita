begin;

create extension if not exists unaccent with schema extensions;

create or replace function public.normalize_sinapi_search_text(p_value text)
returns text
language sql
stable
strict
set search_path = pg_catalog, extensions
as $$
  select btrim(
    regexp_replace(
      lower(extensions.unaccent(p_value)),
      '[^a-z0-9]+',
      ' ',
      'g'
    )
  );
$$;

create or replace function public.list_sinapi_releases(p_company_id uuid)
returns table (
  competence date,
  revision smallint,
  published_at timestamptz,
  row_count integer
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null or not exists (
    select 1
    from public.company_members membership
    where membership.company_id = p_company_id
      and membership.user_id = auth.uid()
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.companies company
    where company.id = p_company_id
      and company.plan = 'ultimate'
  ) then
    raise exception 'SINAPI requer o plano Ultimate'
      using errcode = 'P0001', detail = 'SINAPI_ULTIMATE_REQUIRED';
  end if;

  return query
  select
    release.competence,
    release.revision,
    release.published_at,
    release.row_count
  from public.sinapi_releases release
  where release.status = 'published'
  order by release.competence desc, release.revision desc
  limit 36;
end;
$$;

create or replace function public.search_sinapi(
  p_company_id uuid,
  p_query text,
  p_uf text,
  p_competence date default null,
  p_kind public.sinapi_reference_kind default null,
  p_regime public.sinapi_regime default 'sem_desoneracao',
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  entry_id uuid,
  code text,
  description text,
  unit text,
  kind public.sinapi_reference_kind,
  regime public.sinapi_regime,
  uf text,
  competence date,
  revision smallint,
  cost_cents bigint,
  price_metadata jsonb,
  source_label text
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_release_id uuid;
  v_query text := public.normalize_sinapi_search_text(coalesce(p_query, ''));
  v_code_query text := upper(btrim(coalesce(p_query, '')));
  v_uf text := upper(btrim(coalesce(p_uf, '')));
begin
  if auth.uid() is null or not exists (
    select 1
    from public.company_members membership
    where membership.company_id = p_company_id
      and membership.user_id = auth.uid()
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.companies company
    where company.id = p_company_id
      and company.plan = 'ultimate'
  ) then
    raise exception 'SINAPI requer o plano Ultimate'
      using errcode = 'P0001', detail = 'SINAPI_ULTIMATE_REQUIRED';
  end if;

  if length(v_query) not between 2 and 100 then
    raise exception 'a busca SINAPI deve ter entre 2 e 100 caracteres'
      using errcode = '22023';
  end if;

  if v_uf !~ '^(AC|AL|AM|AP|BA|CE|DF|ES|GO|MA|MG|MS|MT|PA|PB|PE|PI|PR|RJ|RN|RO|RR|RS|SC|SE|SP|TO)$' then
    raise exception 'UF invalida' using errcode = '22023';
  end if;

  if p_competence is not null
    and p_competence <> date_trunc('month', p_competence)::date
  then
    raise exception 'competencia deve ser o primeiro dia do mes'
      using errcode = '22023';
  end if;

  if p_limit not between 1 and 20 then
    raise exception 'limite deve estar entre 1 e 20' using errcode = '22023';
  end if;

  if p_offset not between 0 and 2000 then
    raise exception 'offset deve estar entre 0 e 2000' using errcode = '22023';
  end if;

  select release.id into v_release_id
  from public.sinapi_releases release
  where release.status = 'published'
    and (p_competence is null or release.competence = p_competence)
  order by release.competence desc, release.revision desc
  limit 1;

  if v_release_id is null then
    raise exception 'competencia SINAPI publicada nao encontrada'
      using errcode = 'P0002', detail = 'SINAPI_RELEASE_NOT_FOUND';
  end if;

  return query
  select
    entry.id,
    entry.code,
    entry.description,
    entry.unit,
    entry.kind,
    entry.regime,
    v_uf,
    release.competence,
    release.revision,
    (entry.prices_cents->>v_uf)::bigint,
    coalesce(entry.price_metadata->v_uf, '{}'::jsonb),
    'SINAPI/CAIXA'::text
  from public.sinapi_entries entry
  join public.sinapi_releases release on release.id = entry.release_id
  where entry.release_id = v_release_id
    and entry.regime = p_regime
    and (p_kind is null or entry.kind = p_kind)
    and entry.prices_cents ? v_uf
    and (
      entry.code = v_code_query
      or entry.code like v_code_query || '%'
      or entry.search_text like v_query || '%'
      or entry.search_text like '%' || v_query || '%'
      or entry.search_text % v_query
    )
  order by
    case
      when entry.code = v_code_query then 0
      when entry.code like v_code_query || '%' then 1
      when entry.search_text like v_query || '%' then 2
      when entry.search_text like '%' || v_query || '%' then 3
      else 4
    end,
    similarity(entry.search_text, v_query) desc,
    entry.code
  limit p_limit
  offset p_offset;
end;
$$;

revoke execute on function public.normalize_sinapi_search_text(text)
  from public, anon, authenticated;
revoke execute on function public.list_sinapi_releases(uuid)
  from public, anon;
revoke execute on function public.search_sinapi(
  uuid, text, text, date, public.sinapi_reference_kind,
  public.sinapi_regime, integer, integer
) from public, anon;

grant execute on function public.normalize_sinapi_search_text(text)
  to service_role;
grant execute on function public.list_sinapi_releases(uuid)
  to authenticated, service_role;
grant execute on function public.search_sinapi(
  uuid, text, text, date, public.sinapi_reference_kind,
  public.sinapi_regime, integer, integer
) to authenticated, service_role;

commit;
