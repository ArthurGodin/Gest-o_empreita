-- Guarda qual plano pago foi associado a assinatura do Asaas.
-- Sem isso, um webhook de pagamento nao consegue diferenciar Pro de Ultimate.

alter table public.companies
  add column if not exists saas_asaas_customer_id text;

alter table public.companies
  add column if not exists plan text not null default 'free';

alter table public.companies
  add column if not exists saas_asaas_subscription_id text;

alter table public.companies
  add column if not exists saas_asaas_subscription_plan text;

update public.companies
set saas_asaas_subscription_plan = plan
where saas_asaas_subscription_id is not null
  and saas_asaas_subscription_plan is null
  and plan in ('pro', 'ultimate');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'companies_saas_asaas_subscription_plan_chk'
  ) then
    alter table public.companies
      add constraint companies_saas_asaas_subscription_plan_chk
      check (
        saas_asaas_subscription_plan is null
        or saas_asaas_subscription_plan in ('pro', 'ultimate')
      );
  end if;
end $$;
