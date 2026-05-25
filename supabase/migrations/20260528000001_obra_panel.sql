-- ============================================================================
-- Migration 0005 — Painel da Obra (Fase 1.3)
-- ============================================================================
-- Constrói a fundação do painel operacional da obra. Tudo idempotente.
--
-- Tabelas:
--   - stage_templates       : templates de etapas (sistema + custom)
--   - stage_template_items  : etapas dentro de cada template
--   - project_stages        : etapas reais de uma obra
--   - diary_entries         : diário da obra (texto)
--   - diary_photos          : fotos do diário
--   - project_costs         : gastos lançados pelo empreiteiro
--   - time_entries          : ponto de equipe (encarregado bate por todos)
--
-- Funções/Triggers:
--   - tg_recalc_project_progress : recalcula projects.progress_pct
--   - tg_touch_project_last_diary: atualiza projects.last_diary_at
--   - insert_diary_entry         : RPC atômico entry + photos (max 20)
--   - instantiate_template_stages: RPC popula stages a partir de template
--
-- Storage:
--   - diary-photos (privado) — acesso só via admin client / signed URL
--
-- Seed:
--   - 3 templates de sistema: Cobertura nova / Reforma / Manutenção
--
-- IDEMPOTENTE: re-aplicável N vezes sem erro.
-- ============================================================================

begin;

-- ─── Enums ─────────────────────────────────────────────────────────────────
do $$ begin
  create type public.stage_status as enum ('todo', 'in_progress', 'done');
exception when duplicate_object then null; end $$;

do $$ begin
  -- Labels PT-BR na UI: material=Material, labor=MO, freight=Frete, other=Outros
  create type public.cost_category as enum ('material', 'labor', 'freight', 'other');
exception when duplicate_object then null; end $$;

-- ============================================================================
-- stage_templates — templates de etapas (sistema = company_id null, ou custom)
-- ============================================================================
create table if not exists public.stage_templates (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid references public.companies(id) on delete cascade, -- null = system
  name        text not null,
  description text,
  is_system   boolean not null default false,
  position    int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint stage_templates_name_len_chk        check (char_length(name) between 1 and 100),
  constraint stage_templates_description_len_chk check (description is null or char_length(description) <= 500)
);

create index if not exists stage_templates_company_idx
  on public.stage_templates (company_id, position);

drop trigger if exists stage_templates_set_updated_at on public.stage_templates;
create trigger stage_templates_set_updated_at
  before update on public.stage_templates
  for each row execute function public.tg_set_updated_at();

alter table public.stage_templates enable row level security;

drop policy if exists "tenant scoped — select" on public.stage_templates;
drop policy if exists "tenant scoped — insert" on public.stage_templates;
drop policy if exists "tenant scoped — update" on public.stage_templates;
drop policy if exists "tenant scoped — delete" on public.stage_templates;

-- SELECT permite system templates (company_id null) OU custom da empresa
create policy "tenant scoped — select" on public.stage_templates
  for select to authenticated
  using (company_id is null or company_id in (select public.user_company_ids()));

-- INSERT só permite criar custom (not is_system) na própria empresa
create policy "tenant scoped — insert" on public.stage_templates
  for insert to authenticated
  with check (
    is_system = false
    and company_id in (select public.user_company_ids())
  );

-- UPDATE só em template não-system da própria empresa
create policy "tenant scoped — update" on public.stage_templates
  for update to authenticated
  using (is_system = false and company_id in (select public.user_company_ids()))
  with check (is_system = false and company_id in (select public.user_company_ids()));

create policy "tenant scoped — delete" on public.stage_templates
  for delete to authenticated
  using (is_system = false and company_id in (select public.user_company_ids()));

-- ============================================================================
-- stage_template_items — etapas dentro de um template
-- ============================================================================
create table if not exists public.stage_template_items (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.stage_templates(id) on delete cascade,
  position    int not null default 0,
  name        text not null,
  est_days    int,
  created_at  timestamptz not null default now(),

  constraint sti_name_len_chk check (char_length(name) between 1 and 200),
  constraint sti_est_days_chk check (est_days is null or est_days between 1 and 365)
);

create index if not exists stage_template_items_template_idx
  on public.stage_template_items (template_id, position);

alter table public.stage_template_items enable row level security;

drop policy if exists "tenant scoped — select" on public.stage_template_items;
drop policy if exists "tenant scoped — insert" on public.stage_template_items;
drop policy if exists "tenant scoped — update" on public.stage_template_items;
drop policy if exists "tenant scoped — delete" on public.stage_template_items;

-- SELECT via join: usuário vê items se vê o template
create policy "tenant scoped — select" on public.stage_template_items
  for select to authenticated
  using (
    exists (
      select 1 from public.stage_templates t
      where t.id = stage_template_items.template_id
        and (t.company_id is null or t.company_id in (select public.user_company_ids()))
    )
  );

-- INSERT/UPDATE/DELETE só em template custom da própria empresa
create policy "tenant scoped — insert" on public.stage_template_items
  for insert to authenticated
  with check (
    exists (
      select 1 from public.stage_templates t
      where t.id = stage_template_items.template_id
        and t.is_system = false
        and t.company_id in (select public.user_company_ids())
    )
  );

create policy "tenant scoped — update" on public.stage_template_items
  for update to authenticated
  using (
    exists (
      select 1 from public.stage_templates t
      where t.id = stage_template_items.template_id
        and t.is_system = false
        and t.company_id in (select public.user_company_ids())
    )
  )
  with check (
    exists (
      select 1 from public.stage_templates t
      where t.id = stage_template_items.template_id
        and t.is_system = false
        and t.company_id in (select public.user_company_ids())
    )
  );

create policy "tenant scoped — delete" on public.stage_template_items
  for delete to authenticated
  using (
    exists (
      select 1 from public.stage_templates t
      where t.id = stage_template_items.template_id
        and t.is_system = false
        and t.company_id in (select public.user_company_ids())
    )
  );

-- ============================================================================
-- project_stages — etapas reais de uma obra
-- ============================================================================
create table if not exists public.project_stages (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  company_id   uuid not null references public.companies(id) on delete cascade,
  position     int not null default 0,
  name         text not null,
  status       public.stage_status not null default 'todo',
  est_days     int,
  started_on   date,
  completed_on date,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint project_stages_name_len_chk     check (char_length(name) between 1 and 200),
  constraint project_stages_notes_len_chk    check (notes is null or char_length(notes) <= 2000),
  constraint project_stages_est_days_chk     check (est_days is null or est_days between 1 and 365)
);

create index if not exists project_stages_project_idx
  on public.project_stages (project_id, position);

create unique index if not exists project_stages_project_position_uq
  on public.project_stages (project_id, position);

drop trigger if exists project_stages_set_updated_at on public.project_stages;
create trigger project_stages_set_updated_at
  before update on public.project_stages
  for each row execute function public.tg_set_updated_at();

alter table public.project_stages enable row level security;

drop policy if exists "tenant scoped — select" on public.project_stages;
drop policy if exists "tenant scoped — insert" on public.project_stages;
drop policy if exists "tenant scoped — update" on public.project_stages;
drop policy if exists "tenant scoped — delete" on public.project_stages;

create policy "tenant scoped — select" on public.project_stages
  for select to authenticated
  using (company_id in (select public.user_company_ids()));

create policy "tenant scoped — insert" on public.project_stages
  for insert to authenticated
  with check (company_id in (select public.user_company_ids()));

create policy "tenant scoped — update" on public.project_stages
  for update to authenticated
  using (company_id in (select public.user_company_ids()))
  with check (company_id in (select public.user_company_ids()));

create policy "tenant scoped — delete" on public.project_stages
  for delete to authenticated
  using (company_id in (select public.user_company_ids()));

-- ============================================================================
-- diary_entries — diário de obra (texto)
-- ============================================================================
create table if not exists public.diary_entries (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  author_id  uuid references auth.users(id),
  body       text not null default '',
  weather    text,
  created_at timestamptz not null default now(),

  constraint diary_entries_body_len_chk    check (char_length(body) <= 2000),
  constraint diary_entries_weather_len_chk check (weather is null or char_length(weather) <= 50)
);

create index if not exists diary_entries_project_idx
  on public.diary_entries (project_id, created_at desc);

alter table public.diary_entries enable row level security;

drop policy if exists "tenant scoped — select" on public.diary_entries;
drop policy if exists "tenant scoped — insert" on public.diary_entries;
drop policy if exists "tenant scoped — update" on public.diary_entries;
drop policy if exists "tenant scoped — delete" on public.diary_entries;

create policy "tenant scoped — select" on public.diary_entries
  for select to authenticated
  using (company_id in (select public.user_company_ids()));

create policy "tenant scoped — insert" on public.diary_entries
  for insert to authenticated
  with check (company_id in (select public.user_company_ids()));

create policy "tenant scoped — update" on public.diary_entries
  for update to authenticated
  using (company_id in (select public.user_company_ids()))
  with check (company_id in (select public.user_company_ids()));

create policy "tenant scoped — delete" on public.diary_entries
  for delete to authenticated
  using (company_id in (select public.user_company_ids()));

-- ============================================================================
-- diary_photos — fotos do diário (paths no bucket privado)
-- ============================================================================
create table if not exists public.diary_photos (
  id           uuid primary key default gen_random_uuid(),
  entry_id     uuid not null references public.diary_entries(id) on delete cascade,
  project_id   uuid not null references public.projects(id) on delete cascade,
  company_id   uuid not null references public.companies(id) on delete cascade,
  storage_path text not null,
  width        int,
  height       int,
  size_bytes   int not null,
  position     int not null default 0,
  created_at   timestamptz not null default now(),

  constraint diary_photos_size_chk     check (size_bytes between 1 and 5242880),
  constraint diary_photos_path_len_chk check (char_length(storage_path) between 1 and 500),
  constraint diary_photos_dims_chk     check (
    (width is null and height is null)
    or (width between 1 and 10000 and height between 1 and 10000)
  )
);

create index if not exists diary_photos_entry_idx
  on public.diary_photos (entry_id, position);

alter table public.diary_photos enable row level security;

drop policy if exists "tenant scoped — select" on public.diary_photos;
drop policy if exists "tenant scoped — insert" on public.diary_photos;
drop policy if exists "tenant scoped — update" on public.diary_photos;
drop policy if exists "tenant scoped — delete" on public.diary_photos;

create policy "tenant scoped — select" on public.diary_photos
  for select to authenticated
  using (company_id in (select public.user_company_ids()));

create policy "tenant scoped — insert" on public.diary_photos
  for insert to authenticated
  with check (company_id in (select public.user_company_ids()));

create policy "tenant scoped — update" on public.diary_photos
  for update to authenticated
  using (company_id in (select public.user_company_ids()))
  with check (company_id in (select public.user_company_ids()));

create policy "tenant scoped — delete" on public.diary_photos
  for delete to authenticated
  using (company_id in (select public.user_company_ids()));

-- ============================================================================
-- project_costs — gastos lançados
-- ============================================================================
create table if not exists public.project_costs (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  company_id   uuid not null references public.companies(id) on delete cascade,
  stage_id     uuid references public.project_stages(id) on delete set null,
  category     public.cost_category not null,
  description  text not null,
  amount_cents bigint not null,
  incurred_on  date not null default current_date,
  created_at   timestamptz not null default now(),
  created_by   uuid references auth.users(id),

  constraint project_costs_amount_chk      check (amount_cents between 1 and 100000000),
  constraint project_costs_description_chk check (char_length(description) between 1 and 200)
);

create index if not exists project_costs_project_idx
  on public.project_costs (project_id, incurred_on desc);

create index if not exists project_costs_stage_idx
  on public.project_costs (stage_id) where stage_id is not null;

alter table public.project_costs enable row level security;

drop policy if exists "tenant scoped — select" on public.project_costs;
drop policy if exists "tenant scoped — insert" on public.project_costs;
drop policy if exists "tenant scoped — update" on public.project_costs;
drop policy if exists "tenant scoped — delete" on public.project_costs;

create policy "tenant scoped — select" on public.project_costs
  for select to authenticated
  using (company_id in (select public.user_company_ids()));

create policy "tenant scoped — insert" on public.project_costs
  for insert to authenticated
  with check (company_id in (select public.user_company_ids()));

create policy "tenant scoped — update" on public.project_costs
  for update to authenticated
  using (company_id in (select public.user_company_ids()))
  with check (company_id in (select public.user_company_ids()));

create policy "tenant scoped — delete" on public.project_costs
  for delete to authenticated
  using (company_id in (select public.user_company_ids()));

-- ============================================================================
-- time_entries — ponto (encarregado bate por todos)
-- ============================================================================
create table if not exists public.time_entries (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects(id) on delete cascade,
  company_id     uuid not null references public.companies(id) on delete cascade,
  worker_name    text not null,
  worker_role    text,
  worked_on      date not null default current_date,
  started_at     time not null,
  ended_at       time,
  hours_worked   numeric(4,2),
  gps_lat        numeric(9,6),
  gps_lng        numeric(9,6),
  gps_accuracy_m int,
  notes          text,
  created_at     timestamptz not null default now(),
  created_by     uuid references auth.users(id),

  constraint time_entries_worker_name_len_chk check (char_length(worker_name) between 1 and 100),
  constraint time_entries_worker_role_len_chk check (worker_role is null or char_length(worker_role) <= 50),
  constraint time_entries_hours_chk           check (hours_worked is null or hours_worked between 0 and 24),
  constraint time_entries_notes_len_chk       check (notes is null or char_length(notes) <= 500),
  constraint time_entries_gps_lat_chk         check (gps_lat is null or gps_lat between -90 and 90),
  constraint time_entries_gps_lng_chk         check (gps_lng is null or gps_lng between -180 and 180),
  constraint time_entries_gps_acc_chk         check (gps_accuracy_m is null or gps_accuracy_m between 0 and 100000)
);

create index if not exists time_entries_project_date_idx
  on public.time_entries (project_id, worked_on desc);

-- Dedup: mesmo peão não pode ter 2 pontos fechados no mesmo dia/obra
create unique index if not exists time_entries_dedup_uq
  on public.time_entries (project_id, lower(worker_name), worked_on)
  where ended_at is not null;

alter table public.time_entries enable row level security;

drop policy if exists "tenant scoped — select" on public.time_entries;
drop policy if exists "tenant scoped — insert" on public.time_entries;
drop policy if exists "tenant scoped — update" on public.time_entries;
drop policy if exists "tenant scoped — delete" on public.time_entries;

create policy "tenant scoped — select" on public.time_entries
  for select to authenticated
  using (company_id in (select public.user_company_ids()));

create policy "tenant scoped — insert" on public.time_entries
  for insert to authenticated
  with check (company_id in (select public.user_company_ids()));

create policy "tenant scoped — update" on public.time_entries
  for update to authenticated
  using (company_id in (select public.user_company_ids()))
  with check (company_id in (select public.user_company_ids()));

create policy "tenant scoped — delete" on public.time_entries
  for delete to authenticated
  using (company_id in (select public.user_company_ids()));

-- ============================================================================
-- ALTER projects — colunas denormalizadas + template_id
-- ============================================================================
alter table public.projects
  add column if not exists template_id    uuid references public.stage_templates(id) on delete set null,
  add column if not exists progress_pct   numeric(5,2),
  add column if not exists last_diary_at  timestamptz;

-- ─── Trigger: recalc progress_pct quando stages mudam ──────────────────────
create or replace function public.tg_recalc_project_progress()
returns trigger
language plpgsql
as $$
declare
  v_project_id uuid;
  v_done       int;
  v_total      int;
begin
  v_project_id := coalesce(new.project_id, old.project_id);
  select
    count(*) filter (where status = 'done'),
    count(*)
  into v_done, v_total
  from public.project_stages
  where project_id = v_project_id;

  update public.projects
    set progress_pct = case when v_total = 0 then 0
                            else round(v_done::numeric * 100 / v_total, 2) end
  where id = v_project_id;

  return null;
end;
$$;

drop trigger if exists project_stages_recalc_progress on public.project_stages;
create trigger project_stages_recalc_progress
  after insert or update or delete on public.project_stages
  for each row execute function public.tg_recalc_project_progress();

-- ─── Trigger: atualiza projects.last_diary_at no insert de diary entry ─────
create or replace function public.tg_touch_project_last_diary()
returns trigger
language plpgsql
as $$
begin
  update public.projects
    set last_diary_at = new.created_at
  where id = new.project_id;
  return null;
end;
$$;

drop trigger if exists diary_entries_touch_project on public.diary_entries;
create trigger diary_entries_touch_project
  after insert on public.diary_entries
  for each row execute function public.tg_touch_project_last_diary();

-- ============================================================================
-- RPC — insert_diary_entry (atômico, valida tenant + max 20 fotos + não vazio)
-- ============================================================================
create or replace function public.insert_diary_entry(
  p_project_id uuid,
  p_company_id uuid,
  p_body       text,
  p_photos     jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry_id uuid;
  v_photo_count int;
begin
  -- Authz
  if not exists (
    select 1 from public.company_members
    where company_id = p_company_id and user_id = auth.uid()
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Project deve pertencer à company
  if not exists (
    select 1 from public.projects
    where id = p_project_id and company_id = p_company_id
  ) then
    raise exception 'project not found' using errcode = '42501';
  end if;

  v_photo_count := jsonb_array_length(coalesce(p_photos, '[]'::jsonb));

  if v_photo_count > 20 then
    raise exception 'too many photos' using errcode = '22023';
  end if;

  if (p_body is null or btrim(p_body) = '') and v_photo_count = 0 then
    raise exception 'empty entry' using errcode = '22023';
  end if;

  insert into public.diary_entries (project_id, company_id, author_id, body)
    values (p_project_id, p_company_id, auth.uid(), coalesce(p_body, ''))
    returning id into v_entry_id;

  if v_photo_count > 0 then
    insert into public.diary_photos
      (entry_id, project_id, company_id, storage_path, width, height, size_bytes, position)
    select
      v_entry_id, p_project_id, p_company_id,
      el->>'storage_path',
      nullif((el->>'width'),  '')::int,
      nullif((el->>'height'), '')::int,
      (el->>'size_bytes')::int,
      coalesce(nullif((el->>'position'), '')::int, (row_number() over () - 1)::int)
    from jsonb_array_elements(p_photos) el;
  end if;

  return v_entry_id;
end;
$$;

grant execute on function public.insert_diary_entry(uuid, uuid, text, jsonb) to authenticated;

-- ============================================================================
-- RPC — instantiate_template_stages (popula project_stages a partir de template)
-- ============================================================================
create or replace function public.instantiate_template_stages(
  p_project_id  uuid,
  p_company_id  uuid,
  p_template_id uuid
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted int;
begin
  if not exists (
    select 1 from public.company_members
    where company_id = p_company_id and user_id = auth.uid()
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.projects
    where id = p_project_id and company_id = p_company_id
  ) then
    raise exception 'project not found' using errcode = '42501';
  end if;

  -- Template tem que ser do system OU da própria company
  if not exists (
    select 1 from public.stage_templates
    where id = p_template_id and (company_id is null or company_id = p_company_id)
  ) then
    raise exception 'template not accessible' using errcode = '42501';
  end if;

  insert into public.project_stages (project_id, company_id, position, name, est_days)
  select p_project_id, p_company_id, sti.position, sti.name, sti.est_days
  from public.stage_template_items sti
  where sti.template_id = p_template_id
  order by sti.position;

  get diagnostics v_inserted = row_count;

  update public.projects set template_id = p_template_id where id = p_project_id;

  return v_inserted;
end;
$$;

grant execute on function public.instantiate_template_stages(uuid, uuid, uuid) to authenticated;

-- ============================================================================
-- Storage bucket — diary-photos (PRIVADO)
-- ============================================================================
insert into storage.buckets (id, name, public)
  values ('diary-photos', 'diary-photos', false)
  on conflict (id) do nothing;

-- NENHUMA policy de RLS no bucket — acesso só via admin client server-side.

-- ============================================================================
-- SEED — 3 templates de sistema (idempotente: delete-then-insert por slug)
-- ============================================================================
-- Estratégia: identificamos system templates pelo (company_id is null, name).
-- Pra re-aplicar, deletamos os 3 antes — CASCADE limpa template_items.
-- Não impacta nenhum project que apontava (template_id vira null por SET NULL).

delete from public.stage_templates
  where company_id is null
    and is_system = true
    and name in ('Cobertura nova', 'Reforma de cobertura', 'Manutenção e limpeza');

with t as (
  insert into public.stage_templates (company_id, name, description, is_system, position)
  values
    (null, 'Cobertura nova',        'Telhado completo do zero ou substituição total',  true, 1),
    (null, 'Reforma de cobertura',  'Troca parcial de telhas, calhas, vedação',        true, 2),
    (null, 'Manutenção e limpeza',  'Vistoria, limpeza de calhas, selante',            true, 3)
  returning id, name
)
insert into public.stage_template_items (template_id, position, name, est_days)
select t.id, x.position, x.name, x.est_days
from t
cross join lateral (
  values
    -- Cobertura nova (6 etapas)
    ('Cobertura nova', 0, 'Remoção do telhado antigo',  1),
    ('Cobertura nova', 1, 'Reparo estrutural',          2),
    ('Cobertura nova', 2, 'Manta asfáltica',            1),
    ('Cobertura nova', 3, 'Colocação de telha',         4),
    ('Cobertura nova', 4, 'Calhas e rufos',             3),
    ('Cobertura nova', 5, 'Limpeza e entrega',          1),
    -- Reforma de cobertura (5 etapas)
    ('Reforma de cobertura', 0, 'Vistoria e diagnóstico',         1),
    ('Reforma de cobertura', 1, 'Substituição de telhas quebradas', 2),
    ('Reforma de cobertura', 2, 'Reparo de calhas e rufos',        2),
    ('Reforma de cobertura', 3, 'Pintura e impermeabilização',     2),
    ('Reforma de cobertura', 4, 'Limpeza final',                   1),
    -- Manutenção e limpeza (4 etapas)
    ('Manutenção e limpeza', 0, 'Vistoria',                  1),
    ('Manutenção e limpeza', 1, 'Limpeza de calhas',         1),
    ('Manutenção e limpeza', 2, 'Aplicação de selante',      1),
    ('Manutenção e limpeza', 3, 'Entrega ao cliente',        1)
) as x(template_name, position, name, est_days)
where t.name = x.template_name;

commit;
