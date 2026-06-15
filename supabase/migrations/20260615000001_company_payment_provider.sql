alter table public.companies
  add column if not exists payment_provider text not null default 'asaas',
  add column if not exists pix_key_type text,
  add column if not exists pix_key text,
  add column if not exists pix_receiver_name text,
  add column if not exists pix_receiver_city text,
  add column if not exists pix_instructions text;

alter table public.companies
  alter column payment_provider set default 'manual_pix';

alter table public.billing_charges
  add column if not exists payment_provider text not null default 'asaas',                                      
  add column if not exists paid_manually_at timestamptz,
  add column if not exists paid_manually_by uuid references auth.users(id),
  add column if not exists manual_payment_note text;

do $$
begin
  alter table public.companies
    add constraint companies_payment_provider_chk
    check (payment_provider in ('asaas', 'manual_pix'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.companies
    add constraint companies_pix_key_type_chk
    check (
      pix_key_type is null
      or pix_key_type in ('cpf', 'cnpj', 'phone', 'email', 'random')
    );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.companies
    add constraint companies_pix_receiver_name_len_chk
    check (pix_receiver_name is null or char_length(pix_receiver_name) between 2 and 80);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.companies
    add constraint companies_pix_receiver_city_len_chk
    check (pix_receiver_city is null or char_length(pix_receiver_city) between 2 and 80);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.billing_charges
    add constraint billing_charges_payment_provider_chk
    check (payment_provider in ('asaas', 'manual_pix'));
exception
  when duplicate_object then null;
end $$;

create index if not exists billing_charges_manual_paid_at_idx
  on public.billing_charges (company_id, paid_manually_at)
  where paid_manually_at is not null;
