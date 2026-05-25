-- ============================================================================
-- Migration 0002 — Security hardening
-- ============================================================================
-- Aperta políticas RLS criadas em 0001. Endereça vulnerabilidades:
--
--   SEC-1: anon SELECT em quotes/quote_items vazava QUALQUER orçamento
--          com share_token não-nulo. Removido. O link público vai ser
--          servido por route handler server-side com o admin client +
--          verificação do token.
--
--   SEC-2: "user can insert self as owner during onboarding" permitia
--          que qualquer usuário se adicionasse como owner de qualquer
--          company. Apertado: só funciona quando a company ainda não
--          tem membros (bootstrap real).
--
--   SEC-3: "authenticated users can create companies (onboarding)"
--          permitia que qualquer usuário criasse N companies via REST.
--          Removido. Onboarding já passa pelo admin client (server-side)
--          e checa duplicidade na server action.
--
--   SEC-8: share_token sem constraint de comprimento — guessable
--          tokens poderiam vazar orçamentos. Adicionado CHECK >= 32
--          e DEFAULT cripto.
--
-- IDEMPOTENTE: usa drop policy if exists antes de recriar. Re-runnable.
-- ============================================================================

begin;

-- ─── SEC-1: remover policies anon de quotes/quote_items ────────────────────
drop policy if exists "public share token — read quote"       on public.quotes;
drop policy if exists "public share token — read quote items" on public.quote_items;

-- ─── SEC-2: bootstrap só para a primeira membership da company ─────────────
-- Drop ambos os nomes (antigo + novo) para garantir re-execução limpa.
drop policy if exists "user can insert self as owner during onboarding"
  on public.company_members;
drop policy if exists "bootstrap first owner of empty company"
  on public.company_members;

create policy "bootstrap first owner of empty company"
  on public.company_members for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and role = 'owner'
    and not exists (
      select 1 from public.company_members existing
      where existing.company_id = company_members.company_id
    )
  );

-- ─── SEC-3: remover INSERT aberto em companies ─────────────────────────────
-- Onboarding agora obrigatoriamente passa pelo server action com admin
-- client (que valida sessão e existência prévia de membership).
drop policy if exists "authenticated users can create companies (onboarding)"
  on public.companies;

-- ─── SEC-8: share_token com comprimento mínimo + default seguro ────────────
-- 24 bytes em base64url = 32 chars. Entropia ~144 bits — não enumerável.
alter table public.quotes
  alter column share_token set default encode(gen_random_bytes(24), 'base64');

alter table public.quotes
  drop constraint if exists quotes_share_token_length_chk;

alter table public.quotes
  add constraint quotes_share_token_length_chk
  check (share_token is null or length(share_token) >= 32);

commit;
