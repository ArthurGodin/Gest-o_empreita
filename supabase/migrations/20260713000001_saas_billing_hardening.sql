-- Separa assinatura ativa de checkout pendente e impede que clientes alterem
-- campos de entitlement diretamente pela API publica do Supabase.

alter table public.companies
  add column if not exists saas_pending_payment_link_id text,
  add column if not exists saas_pending_payment_link_url text,
  add column if not exists saas_pending_plan text,
  add column if not exists saas_pending_checkout_token uuid,
  add column if not exists saas_pending_checkout_started_at timestamptz;

update public.companies
set plan = 'free'
where plan is null
  or plan not in ('free', 'pro', 'ultimate');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'companies_plan_chk'
  ) then
    alter table public.companies
      add constraint companies_plan_chk
      check (plan in ('free', 'pro', 'ultimate'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'companies_saas_pending_plan_chk'
  ) then
    alter table public.companies
      add constraint companies_saas_pending_plan_chk
      check (saas_pending_plan is null or saas_pending_plan in ('pro', 'ultimate'));
  end if;
end $$;

create unique index if not exists companies_saas_pending_payment_link_uidx
  on public.companies (saas_pending_payment_link_id)
  where saas_pending_payment_link_id is not null;

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
