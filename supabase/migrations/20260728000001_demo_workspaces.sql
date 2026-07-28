-- Separa empresas reais de ambientes demonstrativos e protege o modo contra
-- promocao pelo cliente autenticado.

alter table public.companies
  add column if not exists workspace_mode text not null default 'live';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'companies_workspace_mode_chk'
      and conrelid = 'public.companies'::regclass
  ) then
    alter table public.companies
      add constraint companies_workspace_mode_chk
      check (workspace_mode in ('live', 'demo'));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'companies_demo_requires_ultimate_chk'
      and conrelid = 'public.companies'::regclass
  ) then
    alter table public.companies
      add constraint companies_demo_requires_ultimate_chk
      check (workspace_mode <> 'demo' or plan = 'ultimate');
  end if;
end
$$;

comment on column public.companies.workspace_mode is
  'live opera normalmente; demo libera avaliacao interna e bloqueia efeitos financeiros externos.';

create or replace function public.protect_company_entitlement_fields()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  jwt_role text := coalesce(auth.role(), '');
begin
  if jwt_role not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.plan := 'free';
    new.workspace_mode := 'live';
    new.saas_asaas_customer_id := null;
    new.saas_asaas_subscription_id := null;
    new.saas_asaas_subscription_plan := null;
    new.saas_pending_payment_link_id := null;
    new.saas_pending_payment_link_url := null;
    new.saas_pending_plan := null;
    new.saas_pending_checkout_token := null;
    new.saas_pending_checkout_started_at := null;
    return new;
  end if;

  if new.plan is distinct from old.plan
    or new.workspace_mode is distinct from old.workspace_mode
    or new.saas_asaas_customer_id is distinct from old.saas_asaas_customer_id
    or new.saas_asaas_subscription_id is distinct from old.saas_asaas_subscription_id
    or new.saas_asaas_subscription_plan is distinct from old.saas_asaas_subscription_plan
    or new.saas_pending_payment_link_id is distinct from old.saas_pending_payment_link_id
    or new.saas_pending_payment_link_url is distinct from old.saas_pending_payment_link_url
    or new.saas_pending_plan is distinct from old.saas_pending_plan
    or new.saas_pending_checkout_token is distinct from old.saas_pending_checkout_token
    or new.saas_pending_checkout_started_at is distinct from old.saas_pending_checkout_started_at
  then
    raise exception 'billing entitlement fields are server-managed'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists companies_protect_entitlement_fields on public.companies;
create trigger companies_protect_entitlement_fields
  before insert or update on public.companies
  for each row execute function public.protect_company_entitlement_fields();
