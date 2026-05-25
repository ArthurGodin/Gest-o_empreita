-- ============================================================================
-- Migration 0004 — Hardening da Fase 1.2 (correções de code/security review)
-- ============================================================================
-- Aplica fixes identificados na revisão automatizada dos 5 PRs da Fase 1.2:
--
--   CR-#11 (B5)  : updateQuoteAction não-transacional → RPC replace_quote_items
--   CR-#1  (A1)  : PDF cache stale → nova coluna pdf_generated_at
--   CR-#7  (C2)  : double-click duplica audit row → unique(quote_id, action) em
--                 quote_approvals (com WHERE pra permitir mudança de mente
--                 entre approved/rejected no futuro — hoje status é terminal,
--                 então o unique global em (quote_id, action) está OK)
--   CR-#8  (A4)  : convertToProject race → unique parcial em quotes.project_id
--                 (no banco — UM project_id pode aparecer em só UMA quote)
--   SR-#5  (DoS) : CHECK length em campos texto pra defesa-em-profundidade
--   SR-#9        : UNIQUE em quotes.share_token (era index, agora constraint)
--
-- IDEMPOTENTE: drop policy if exists, drop function if exists, alter ... add
-- column if not exists. Pode rodar quantas vezes precisar.
-- ============================================================================

begin;

-- ─── CR-#1: PDF cache timestamp pra detectar staleness ─────────────────────
alter table public.quotes
  add column if not exists pdf_generated_at timestamptz;

-- ─── CR-#7: prevenção de audit duplicado em quote_approvals ────────────────
-- A constraint impede 2 aprovações idênticas pro mesmo quote, MAS permite
-- uma aprovada + uma recusada (raro, mas conceitualmente válido).
alter table public.quote_approvals
  drop constraint if exists quote_approvals_quote_action_uq;
alter table public.quote_approvals
  add constraint quote_approvals_quote_action_uq unique (quote_id, action);

-- ─── CR-#8: quotes.project_id deve ser único (cada projeto vem de UM quote) ─
drop index if exists quotes_project_id_uq;
create unique index quotes_project_id_uq
  on public.quotes (project_id)
  where project_id is not null;

-- ─── SR-#9: garantia explícita de unicidade do share_token ─────────────────
-- (Já existe constraint UNIQUE da definição original da tabela, mas o
-- comportamento exato depende da migration 0001. Adicionamos índice como
-- defense-in-depth — `if not exists` evita conflito se já houver.)
create unique index if not exists quotes_share_token_uq
  on public.quotes (share_token)
  where share_token is not null;

-- ─── SR-#5: max-length em campos texto pra impedir DoS via PDF render ──────
alter table public.quotes
  drop constraint if exists quotes_title_len_chk,
  drop constraint if exists quotes_description_len_chk,
  drop constraint if exists quotes_notes_len_chk;

alter table public.quotes
  add constraint quotes_title_len_chk
    check (char_length(title) <= 200),
  add constraint quotes_description_len_chk
    check (description is null or char_length(description) <= 5000),
  add constraint quotes_notes_len_chk
    check (notes is null or char_length(notes) <= 5000);

alter table public.quote_items
  drop constraint if exists quote_items_description_len_chk,
  drop constraint if exists quote_items_unit_len_chk;

alter table public.quote_items
  add constraint quote_items_description_len_chk
    check (char_length(description) <= 500),
  add constraint quote_items_unit_len_chk
    check (char_length(unit) <= 10);

alter table public.quote_approvals
  drop constraint if exists quote_approvals_signer_name_len_chk,
  drop constraint if exists quote_approvals_rejection_reason_len_chk;

alter table public.quote_approvals
  add constraint quote_approvals_signer_name_len_chk
    check (char_length(signer_name) between 2 and 200),
  add constraint quote_approvals_rejection_reason_len_chk
    check (rejection_reason is null or char_length(rejection_reason) <= 1000);

-- ─── CR-#11 (B5): RPC atômico pra substituir items + atualizar header ─────
-- Substitui o padrão delete-then-insert do updateQuoteAction (que perde dados
-- se o insert falhar). Tudo numa transação implícita do PL/pgSQL.

create or replace function public.replace_quote_items(
  p_quote_id      uuid,
  p_company_id    uuid,
  p_title         text,
  p_description   text,
  p_customer_id   uuid,
  p_valid_until   date,
  p_notes         text,
  p_items         jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subtotal bigint := 0;
  v_item     jsonb;
  v_position int := 0;
  v_total    bigint;
begin
  -- Autorização: usuário deve ser membro da company
  if not exists (
    select 1 from public.company_members
    where company_id = p_company_id and user_id = auth.uid()
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Quote deve estar em draft
  if not exists (
    select 1 from public.quotes
    where id = p_quote_id and company_id = p_company_id and status = 'draft'
  ) then
    raise exception 'quote not editable' using errcode = '42501';
  end if;

  -- Calcula subtotal antes de mexer nos itens (validação)
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_total := round(
      (v_item->>'quantity')::numeric * (v_item->>'unit_price_cents')::numeric
    )::bigint;
    v_subtotal := v_subtotal + v_total;
  end loop;

  -- Atualiza header (header inclui invalidação do cache de PDF)
  update public.quotes set
    title             = p_title,
    description       = p_description,
    customer_id       = p_customer_id,
    valid_until       = p_valid_until,
    notes             = p_notes,
    subtotal_cents    = v_subtotal,
    total_cents       = v_subtotal,
    pdf_storage_path  = null,   -- CR-#1: invalida cache do PDF ao editar
    pdf_generated_at  = null
  where id = p_quote_id and company_id = p_company_id;

  -- Apaga items antigos
  delete from public.quote_items where quote_id = p_quote_id;

  -- Insere novos items (se houver)
  if jsonb_array_length(p_items) > 0 then
    insert into public.quote_items (
      quote_id, company_id, position, description, unit,
      quantity, unit_price_cents, total_cents
    )
    select
      p_quote_id,
      p_company_id,
      row_number() over () - 1,
      el->>'description',
      coalesce(nullif(el->>'unit', ''), 'un'),
      (el->>'quantity')::numeric,
      (el->>'unit_price_cents')::bigint,
      round((el->>'quantity')::numeric * (el->>'unit_price_cents')::numeric)::bigint
    from jsonb_array_elements(p_items) el;
  end if;
end;
$$;

grant execute on function public.replace_quote_items(
  uuid, uuid, text, text, uuid, date, text, jsonb
) to authenticated;

commit;
