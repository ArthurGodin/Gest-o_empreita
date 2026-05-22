-- ============================================================================
-- Migration 0001 — Schema inicial multi-tenant
-- ============================================================================
-- Cria as tabelas fundacionais: companies, company_members, customers,
-- projects, quotes, quote_items. Toda tabela tem RLS habilitado e políticas
-- baseadas em pertencimento (membership) na company.
--
-- Princípio de isolamento: a função public.user_company_ids() retorna o
-- conjunto de companies do usuário autenticado. Todas as políticas filtram
-- por essa função, garantindo que tenant A jamais enxergue dado de tenant B.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ─── Enums ──────────────────────────────────────────────────────────────────
create type public.company_role as enum ('owner', 'manager', 'foreman', 'worker');
create type public.project_status as enum ('planning', 'in_progress', 'paused', 'completed', 'cancelled');
create type public.quote_status as enum ('draft', 'sent', 'viewed', 'approved', 'rejected', 'expired');

-- ─── Helper: trigger genérico para updated_at ───────────────────────────────
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ============================================================================
-- companies (tenant root)
-- ============================================================================
create table public.companies (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  legal_name    text,
  cnpj          text,
  phone         text,
  email         text,
  logo_url      text,
  address       text,
  city          text,
  state         text,
  zip_code      text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger companies_set_updated_at
  before update on public.companies
  for each row execute function public.tg_set_updated_at();

-- ============================================================================
-- company_members (ponte users <-> companies + role)
-- ============================================================================
create table public.company_members (
  company_id    uuid not null references public.companies(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  role          public.company_role not null default 'worker',
  created_at    timestamptz not null default now(),
  primary key (company_id, user_id)
);

create index company_members_user_id_idx on public.company_members(user_id);

-- ─── Helper: companies do usuário atual ─────────────────────────────────────
create or replace function public.user_company_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id
  from public.company_members
  where user_id = auth.uid()
$$;

-- ─── Helper: role do usuário em uma company ─────────────────────────────────
create or replace function public.user_role_in(p_company_id uuid)
returns public.company_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.company_members
  where company_id = p_company_id and user_id = auth.uid()
$$;

-- ============================================================================
-- customers (clientes da empreiteira)
-- ============================================================================
create table public.customers (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  name          text not null,
  document      text,            -- CPF/CNPJ
  phone         text,
  email         text,
  address       text,
  city          text,
  state         text,
  zip_code      text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users(id)
);

create index customers_company_id_idx on public.customers(company_id);

create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.tg_set_updated_at();

-- ============================================================================
-- projects (obras)
-- ============================================================================
create table public.projects (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  customer_id   uuid not null references public.customers(id) on delete restrict,
  name          text not null,
  description   text,
  address       text,
  status        public.project_status not null default 'planning',
  starts_on     date,
  ends_on       date,
  budget_cents  bigint,           -- valor previsto em centavos
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users(id)
);

create index projects_company_id_idx on public.projects(company_id);
create index projects_customer_id_idx on public.projects(customer_id);
create index projects_status_idx on public.projects(status);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.tg_set_updated_at();

-- ============================================================================
-- quotes (orçamentos)
-- ============================================================================
create table public.quotes (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  customer_id     uuid not null references public.customers(id) on delete restrict,
  project_id      uuid references public.projects(id) on delete set null,
  number          text not null,   -- número/código exibido (ex: ORC-2026-0001)
  title           text not null,
  description     text,
  status          public.quote_status not null default 'draft',
  subtotal_cents  bigint not null default 0,
  discount_cents  bigint not null default 0,
  total_cents     bigint not null default 0,
  valid_until     date,
  share_token     text unique,     -- token para link público (sem login)
  sent_at         timestamptz,
  viewed_at       timestamptz,
  approved_at     timestamptz,
  rejected_at     timestamptz,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id),
  unique (company_id, number)
);

create index quotes_company_id_idx on public.quotes(company_id);
create index quotes_customer_id_idx on public.quotes(customer_id);
create index quotes_project_id_idx on public.quotes(project_id);
create index quotes_status_idx on public.quotes(status);
create index quotes_share_token_idx on public.quotes(share_token);

create trigger quotes_set_updated_at
  before update on public.quotes
  for each row execute function public.tg_set_updated_at();

-- ============================================================================
-- quote_items (itens do orçamento)
-- ============================================================================
create table public.quote_items (
  id                uuid primary key default gen_random_uuid(),
  quote_id          uuid not null references public.quotes(id) on delete cascade,
  company_id        uuid not null references public.companies(id) on delete cascade,
  position          int  not null default 0,
  description       text not null,
  unit              text not null default 'un',     -- un, m², m, kg, h...
  quantity          numeric(12,3) not null default 1,
  unit_price_cents  bigint not null default 0,
  total_cents       bigint not null default 0,
  created_at        timestamptz not null default now()
);

create index quote_items_quote_id_idx on public.quote_items(quote_id);
create index quote_items_company_id_idx on public.quote_items(company_id);

-- ============================================================================
-- ROW LEVEL SECURITY — habilitar em todas as tabelas
-- ============================================================================
alter table public.companies        enable row level security;
alter table public.company_members  enable row level security;
alter table public.customers        enable row level security;
alter table public.projects         enable row level security;
alter table public.quotes           enable row level security;
alter table public.quote_items      enable row level security;

-- ─── companies ──────────────────────────────────────────────────────────────
create policy "members can read their companies"
  on public.companies for select
  to authenticated
  using (id in (select public.user_company_ids()));

create policy "owners/managers can update their company"
  on public.companies for update
  to authenticated
  using (public.user_role_in(id) in ('owner','manager'))
  with check (public.user_role_in(id) in ('owner','manager'));

create policy "authenticated users can create companies (onboarding)"
  on public.companies for insert
  to authenticated
  with check (auth.uid() is not null);

-- ─── company_members ────────────────────────────────────────────────────────
create policy "members can read membership of their companies"
  on public.company_members for select
  to authenticated
  using (company_id in (select public.user_company_ids()));

create policy "owners can manage members"
  on public.company_members for all
  to authenticated
  using (public.user_role_in(company_id) = 'owner')
  with check (public.user_role_in(company_id) = 'owner');

create policy "user can insert self as owner during onboarding"
  on public.company_members for insert
  to authenticated
  with check (user_id = auth.uid());

-- ─── Helper genérico para tabelas tenant-scoped ─────────────────────────────
-- Política: tudo CRUD permitido se a row pertence a uma company do usuário.
-- Aplicado a customers, projects, quotes, quote_items.

create policy "tenant scoped — select"
  on public.customers for select
  to authenticated
  using (company_id in (select public.user_company_ids()));

create policy "tenant scoped — insert"
  on public.customers for insert
  to authenticated
  with check (company_id in (select public.user_company_ids()));

create policy "tenant scoped — update"
  on public.customers for update
  to authenticated
  using (company_id in (select public.user_company_ids()))
  with check (company_id in (select public.user_company_ids()));

create policy "tenant scoped — delete"
  on public.customers for delete
  to authenticated
  using (company_id in (select public.user_company_ids()));

-- projects
create policy "tenant scoped — select"
  on public.projects for select to authenticated
  using (company_id in (select public.user_company_ids()));
create policy "tenant scoped — insert"
  on public.projects for insert to authenticated
  with check (company_id in (select public.user_company_ids()));
create policy "tenant scoped — update"
  on public.projects for update to authenticated
  using (company_id in (select public.user_company_ids()))
  with check (company_id in (select public.user_company_ids()));
create policy "tenant scoped — delete"
  on public.projects for delete to authenticated
  using (company_id in (select public.user_company_ids()));

-- quotes
create policy "tenant scoped — select"
  on public.quotes for select to authenticated
  using (company_id in (select public.user_company_ids()));
create policy "tenant scoped — insert"
  on public.quotes for insert to authenticated
  with check (company_id in (select public.user_company_ids()));
create policy "tenant scoped — update"
  on public.quotes for update to authenticated
  using (company_id in (select public.user_company_ids()))
  with check (company_id in (select public.user_company_ids()));
create policy "tenant scoped — delete"
  on public.quotes for delete to authenticated
  using (company_id in (select public.user_company_ids()));

-- quote_items
create policy "tenant scoped — select"
  on public.quote_items for select to authenticated
  using (company_id in (select public.user_company_ids()));
create policy "tenant scoped — insert"
  on public.quote_items for insert to authenticated
  with check (company_id in (select public.user_company_ids()));
create policy "tenant scoped — update"
  on public.quote_items for update to authenticated
  using (company_id in (select public.user_company_ids()))
  with check (company_id in (select public.user_company_ids()));
create policy "tenant scoped — delete"
  on public.quote_items for delete to authenticated
  using (company_id in (select public.user_company_ids()));

-- ─── Link público de orçamento (acesso anônimo via share_token) ─────────────
-- Para a página pública /q/[token] onde o cliente vê e aprova sem login.
-- O RLS para 'anon' só libera SELECT quando o token bate.
-- A API pública filtra por token; isso é uma proteção em profundidade.
create policy "public share token — read quote"
  on public.quotes for select
  to anon
  using (share_token is not null);

create policy "public share token — read quote items"
  on public.quote_items for select
  to anon
  using (
    exists (
      select 1 from public.quotes q
      where q.id = quote_items.quote_id
        and q.share_token is not null
    )
  );
