-- ============================================================================
-- Migration 0003 — Módulo de Orçamentos (Fase 1.2)
-- ============================================================================
-- Cria as bases pra construir o editor de orçamentos, catálogo orgânico de
-- itens, aprovação digital via link público e PDF.
--
-- - catalog_items     : itens reutilizáveis do empreiteiro (autocomplete no editor)
-- - quote_approvals   : histórico imutável de aprovações/rejeições (auditoria)
-- - quote_sequences   : numeração atômica ORC-{ano}-{seq} por empresa
-- - function next_quote_number(company_id)
-- - trigger pra gerar share_token cripto-seguro em quotes
-- - storage buckets: company-logos (público) e quotes-pdf (privado)
--
-- IDEMPOTENTE: pode rodar quantas vezes precisar.
-- ============================================================================

begin;

-- ─── Enum: ação na aprovação (anon insert via admin client) ────────────────
do $$ begin
  create type public.quote_approval_action as enum ('approved', 'rejected');
exception when duplicate_object then null; end $$;

-- ============================================================================
-- catalog_items — catálogo orgânico de itens por empresa
-- ============================================================================
create table if not exists public.catalog_items (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references public.companies(id) on delete cascade,
  description         text not null,
  unit                text not null default 'un',
  default_price_cents bigint not null default 0,
  usage_count         int not null default 0,
  last_used_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Unicidade case-insensitive — não duplica "Telha cerâmica" e "telha cerâmica"
create unique index if not exists catalog_items_company_desc_lower_uq
  on public.catalog_items (company_id, lower(description));

-- Ordenação por mais usado (autocomplete)
create index if not exists catalog_items_recency_idx
  on public.catalog_items (company_id, last_used_at desc nulls last);

drop trigger if exists catalog_items_set_updated_at on public.catalog_items;
create trigger catalog_items_set_updated_at
  before update on public.catalog_items
  for each row execute function public.tg_set_updated_at();

alter table public.catalog_items enable row level security;

drop policy if exists "tenant scoped — select" on public.catalog_items;
drop policy if exists "tenant scoped — insert" on public.catalog_items;
drop policy if exists "tenant scoped — update" on public.catalog_items;
drop policy if exists "tenant scoped — delete" on public.catalog_items;

create policy "tenant scoped — select" on public.catalog_items
  for select to authenticated
  using (company_id in (select public.user_company_ids()));

create policy "tenant scoped — insert" on public.catalog_items
  for insert to authenticated
  with check (company_id in (select public.user_company_ids()));

create policy "tenant scoped — update" on public.catalog_items
  for update to authenticated
  using (company_id in (select public.user_company_ids()))
  with check (company_id in (select public.user_company_ids()));

create policy "tenant scoped — delete" on public.catalog_items
  for delete to authenticated
  using (company_id in (select public.user_company_ids()));

-- ============================================================================
-- quote_approvals — auditoria de aprovações/rejeições (anon insert via admin)
-- ============================================================================
create table if not exists public.quote_approvals (
  id               uuid primary key default gen_random_uuid(),
  quote_id         uuid not null references public.quotes(id) on delete cascade,
  company_id       uuid not null references public.companies(id) on delete cascade,
  action           public.quote_approval_action not null,
  signer_name      text not null,
  rejection_reason text,
  ip_address       inet,
  user_agent       text,
  created_at       timestamptz not null default now()
);

create index if not exists quote_approvals_quote_idx
  on public.quote_approvals (quote_id);

alter table public.quote_approvals enable row level security;

drop policy if exists "tenant scoped — select" on public.quote_approvals;

-- SELECT: visível apenas pra membros da company
create policy "tenant scoped — select" on public.quote_approvals
  for select to authenticated
  using (company_id in (select public.user_company_ids()));

-- INSERT/UPDATE/DELETE: NÃO há policies authenticated nem anon.
-- Escrita só via admin client (service role) nas server actions do link público,
-- que validam o share_token antes de inserir. Isso impede injeção via PostgREST.

-- ============================================================================
-- quote_sequences — numeração atômica por empresa por ano
-- ============================================================================
create table if not exists public.quote_sequences (
  company_id  uuid not null references public.companies(id) on delete cascade,
  year        int  not null,
  last_num    int  not null default 0,
  primary key (company_id, year)
);

alter table public.quote_sequences enable row level security;
-- Sem policies: acesso só via SECURITY DEFINER function abaixo

-- Function atômica que retorna o próximo número (ORC-2026-0001 formato)
create or replace function public.next_quote_number(p_company_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year int := extract(year from now() at time zone 'America/Sao_Paulo')::int;
  v_seq  int;
begin
  -- Garante que a empresa pertence ao chamador (defesa em profundidade)
  if not exists (
    select 1 from public.company_members
    where company_id = p_company_id and user_id = auth.uid()
  ) then
    raise exception 'company % is not accessible to current user', p_company_id
      using errcode = '42501';
  end if;

  insert into public.quote_sequences (company_id, year, last_num)
    values (p_company_id, v_year, 1)
    on conflict (company_id, year)
      do update set last_num = quote_sequences.last_num + 1
    returning last_num into v_seq;

  return format('ORC-%s-%s', v_year, lpad(v_seq::text, 4, '0'));
end;
$$;

grant execute on function public.next_quote_number(uuid) to authenticated;

-- ============================================================================
-- quotes — colunas novas + trigger de share_token automático
-- ============================================================================
alter table public.quotes
  add column if not exists pdf_storage_path     text,
  add column if not exists notification_sent_at timestamptz;

-- Trigger: gera share_token cripto se não vier preenchido no insert.
-- Base64 stripado de +/= pra ficar URL-safe sem precisar encoding extra.
-- 32 bytes → ≥38 chars após strip, sempre acima do CHECK length>=32.
create or replace function public.tg_quotes_ensure_share_token()
returns trigger
language plpgsql
as $$
begin
  if new.share_token is null then
    new.share_token := translate(encode(gen_random_bytes(32), 'base64'), '+/=', '');
  end if;
  return new;
end;
$$;

drop trigger if exists quotes_ensure_share_token on public.quotes;
create trigger quotes_ensure_share_token
  before insert on public.quotes
  for each row execute function public.tg_quotes_ensure_share_token();

-- ============================================================================
-- Storage buckets
-- ============================================================================
insert into storage.buckets (id, name, public)
  values ('company-logos', 'company-logos', true)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('quotes-pdf', 'quotes-pdf', false)
  on conflict (id) do nothing;

-- ─── Policies do bucket company-logos ──────────────────────────────────────
drop policy if exists "company-logos public read" on storage.objects;
create policy "company-logos public read" on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'company-logos');

-- Write/delete: SOMENTE service role (server action valida ownership).
-- Sem policy authenticated — admin client bypassa RLS pra upload.

-- ─── Policies do bucket quotes-pdf ─────────────────────────────────────────
-- Sem policies — acesso só via signed URLs ou admin client server-side.
-- O route handler /api/quotes/[id]/pdf e /q/[token]/pdf streama via admin client.

commit;

-- ─── Verificação (não executa em transação) ────────────────────────────────
-- Cole isto numa query separada pra confirmar:
--
-- select tablename from pg_tables
-- where schemaname='public'
-- and tablename in ('catalog_items','quote_approvals','quote_sequences')
-- order by tablename;
--
-- Deve retornar 3 linhas.
