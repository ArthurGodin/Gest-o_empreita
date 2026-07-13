-- O onboarding atual cria company e membership no servidor depois de validar a
-- sessao e impedir um segundo tenant. Removemos os atalhos antigos da API
-- publica para que esse guard nao possa ser contornado pelo cliente.

drop policy if exists "authenticated users can create companies (onboarding)"
  on public.companies;

drop policy if exists "bootstrap first owner of empty company"
  on public.company_members;
