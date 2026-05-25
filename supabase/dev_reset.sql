-- ============================================================================
-- ⚠️ DESTRUCTIVE — DEV / LOCAL APENAS ⚠️
-- ============================================================================
-- Apaga TODAS as tabelas, funções, enums do schema Gestão Empreita.
-- Rode SOMENTE em projetos Supabase de desenvolvimento, jamais em produção.
-- Após rodar este script, aplique as migrations da pasta `migrations/`
-- pela ordem do timestamp.
--
-- Uso típico (dev local):
--   1. Cole este arquivo inteiro no SQL Editor → Run
--   2. Cole 20260522000001_initial_schema.sql → Run
--   3. Cole 20260524000001_security_hardening.sql → Run
-- ============================================================================

begin;

-- Tabelas (ordem reversa de dependência). CASCADE limpa policies/triggers/índices/FKs.
drop table if exists public.quote_items     cascade;
drop table if exists public.quotes          cascade;
drop table if exists public.projects        cascade;
drop table if exists public.customers       cascade;
drop table if exists public.company_members cascade;
drop table if exists public.companies       cascade;

-- Funções
drop function if exists public.user_role_in(uuid)  cascade;
drop function if exists public.user_company_ids()  cascade;
drop function if exists public.tg_set_updated_at() cascade;

-- Enums
drop type if exists public.quote_status     cascade;
drop type if exists public.project_status   cascade;
drop type if exists public.company_role     cascade;

commit;

-- Verificação: deve sobrar 0 linhas
select tablename
from pg_tables
where schemaname='public'
  and tablename in (
    'companies','company_members','customers','projects','quotes','quote_items'
  )
order by tablename;
