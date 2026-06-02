-- ============================================================================
-- Billing Asaas - Pix de entrada + base para saldo
-- ============================================================================
-- Integra a base local com cobranças Pix no Asaas.
--
-- Objetivo do primeiro corte:
--   - Vincular customers locais a customers Asaas.
--   - Criar cobranças de entrada/saldo por obra.
--   - Atualizar status via webhook idempotente.
--   - Manter RLS em dados de cobrança visíveis ao tenant.
--   - Manter payload cru de webhook invisível ao usuário autenticado.
--
-- IDEMPOTENTE: pode ser reexecutada.
-- ============================================================================

begin;

do $$ begin
  create type public.charge_kind as enum ('entrada', 'saldo');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.charge_status as enum (
    'draft',
    'pending',
    'overdue',
    'received',
    'confirmed',
    'cancelled'
  );
exception when duplicate_object then null; end $$;

-- ============================================================================
-- customer_billing_profiles
-- ============================================================================
create table if not exists public.customer_billing_profiles (
  id                 uuid primary key default gen_random_uuid(),
  customer_id        uuid not null references public.customers(id) on delete cascade,
  company_id         uuid not null references public.companies(id) on delete cascade,
  asaas_customer_id  text not null,
  cpf_cnpj           text not null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint cbp_cpf_cnpj_len_chk check (char_length(cpf_cnpj) between 11 and 14),
  constraint cbp_asaas_id_len_chk check (char_length(asaas_customer_id) between 1 and 100)
);

create unique index if not exists customer_billing_profiles_customer_uq
  on public.customer_billing_profiles (customer_id);

create unique index if not exists customer_billing_profiles_asaas_uq
  on public.customer_billing_profiles (company_id, asaas_customer_id);

drop trigger if exists customer_billing_profiles_set_updated_at
  on public.customer_billing_profiles;
create trigger customer_billing_profiles_set_updated_at
  before update on public.customer_billing_profiles
  for each row execute function public.tg_set_updated_at();

alter table public.customer_billing_profiles enable row level security;

drop policy if exists "tenant scoped - select" on public.customer_billing_profiles;
drop policy if exists "tenant scoped - insert" on public.customer_billing_profiles;
drop policy if exists "tenant scoped - update" on public.customer_billing_profiles;
drop policy if exists "tenant scoped - delete" on public.customer_billing_profiles;

create policy "tenant scoped - select" on public.customer_billing_profiles
  for select to authenticated
  using (company_id in (select public.user_company_ids()));

create policy "tenant scoped - insert" on public.customer_billing_profiles
  for insert to authenticated
  with check (company_id in (select public.user_company_ids()));

create policy "tenant scoped - update" on public.customer_billing_profiles
  for update to authenticated
  using (company_id in (select public.user_company_ids()))
  with check (company_id in (select public.user_company_ids()));

create policy "tenant scoped - delete" on public.customer_billing_profiles
  for delete to authenticated
  using (company_id in (select public.user_company_ids()));

-- ============================================================================
-- billing_charges
-- ============================================================================
create table if not exists public.billing_charges (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid not null references public.projects(id) on delete cascade,
  company_id          uuid not null references public.companies(id) on delete cascade,
  customer_id         uuid not null references public.customers(id) on delete restrict,
  kind                public.charge_kind not null,
  status              public.charge_status not null default 'draft',
  amount_cents        bigint not null,
  asaas_payment_id    text,
  pix_qr_code         text,
  pix_qr_image_b64    text,
  invoice_url         text,
  due_date            date,
  paid_at             timestamptz,
  released_at         timestamptz,
  released_by_token   text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint billing_amount_chk check (amount_cents between 1 and 1000000000),
  constraint billing_qr_len_chk check (pix_qr_code is null or char_length(pix_qr_code) <= 3000),
  constraint billing_qr_img_len_chk check (pix_qr_image_b64 is null or char_length(pix_qr_image_b64) <= 200000),
  constraint billing_invoice_url_chk check (invoice_url is null or char_length(invoice_url) <= 500)
);

create index if not exists billing_charges_project_idx
  on public.billing_charges (project_id, kind);

create index if not exists billing_charges_company_status_idx
  on public.billing_charges (company_id, status);

create unique index if not exists billing_charges_asaas_payment_uq
  on public.billing_charges (company_id, asaas_payment_id)
  where asaas_payment_id is not null;

create unique index if not exists billing_charges_one_per_kind_uq
  on public.billing_charges (project_id, kind);

drop trigger if exists billing_charges_set_updated_at on public.billing_charges;
create trigger billing_charges_set_updated_at
  before update on public.billing_charges
  for each row execute function public.tg_set_updated_at();

alter table public.billing_charges enable row level security;

drop policy if exists "tenant scoped - select" on public.billing_charges;
drop policy if exists "tenant scoped - insert" on public.billing_charges;
drop policy if exists "tenant scoped - update" on public.billing_charges;
drop policy if exists "tenant scoped - delete" on public.billing_charges;

create policy "tenant scoped - select" on public.billing_charges
  for select to authenticated
  using (company_id in (select public.user_company_ids()));

create policy "tenant scoped - insert" on public.billing_charges
  for insert to authenticated
  with check (company_id in (select public.user_company_ids()));

create policy "tenant scoped - update" on public.billing_charges
  for update to authenticated
  using (company_id in (select public.user_company_ids()))
  with check (company_id in (select public.user_company_ids()));

create policy "tenant scoped - delete" on public.billing_charges
  for delete to authenticated
  using (company_id in (select public.user_company_ids()));

-- ============================================================================
-- billing_webhook_events
-- ============================================================================
create table if not exists public.billing_webhook_events (
  id                uuid primary key default gen_random_uuid(),
  asaas_event_id    text not null,
  event_type        text not null,
  asaas_payment_id  text,
  raw_payload       jsonb not null,
  processed_at      timestamptz,
  processing_error  text,
  created_at        timestamptz not null default now()
);

create unique index if not exists billing_webhook_events_event_uq
  on public.billing_webhook_events (asaas_event_id);

create index if not exists billing_webhook_events_payment_idx
  on public.billing_webhook_events (asaas_payment_id);

alter table public.billing_webhook_events enable row level security;
-- Sem policies: acesso apenas via service role em rota server-side.

-- ============================================================================
-- projects: split de entrada e aceite de entrega
-- ============================================================================
do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'projects'
      and column_name = 'entry_pct'
  ) then
    alter table public.projects add column entry_pct numeric(5,2);
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'projects'
      and column_name = 'entry_pct'
      and data_type <> 'numeric'
  ) then
    alter table public.projects
      alter column entry_pct type numeric(5,2)
      using nullif(entry_pct::text, '')::numeric;
  end if;
end $$;

alter table public.projects
  add column if not exists delivery_approved_at timestamptz,
  add column if not exists delivery_approved_token text;

alter table public.projects
  drop constraint if exists projects_entry_pct_chk;

alter table public.projects
  add constraint projects_entry_pct_chk
  check (entry_pct is null or (entry_pct >= 0 and entry_pct <= 100));

commit;
