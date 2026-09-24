-- Administrative restriction for workspaces that must receive only on their own Pix key.
alter table public.companies
  add column if not exists manual_pix_only boolean not null default false;

alter table public.companies
  add constraint companies_manual_pix_only_provider_chk
  check (not manual_pix_only or payment_provider = 'manual_pix');

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
    new.manual_pix_only := false;
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
    or new.manual_pix_only is distinct from old.manual_pix_only
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
