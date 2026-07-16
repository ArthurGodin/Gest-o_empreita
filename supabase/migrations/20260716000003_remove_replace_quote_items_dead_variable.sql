create or replace function public.replace_quote_items(
  p_quote_id uuid,
  p_company_id uuid,
  p_title text,
  p_description text,
  p_customer_id uuid,
  p_valid_until date,
  p_notes text,
  p_items jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subtotal bigint := 0;
  v_item jsonb;
  v_total bigint;
begin
  if not exists (
    select 1
    from public.company_members
    where company_id = p_company_id
      and user_id = auth.uid()
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.quotes
    where id = p_quote_id
      and company_id = p_company_id
      and status = 'draft'
  ) then
    raise exception 'quote not editable' using errcode = '42501';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_total := round(
      (v_item->>'quantity')::numeric * (v_item->>'unit_price_cents')::numeric
    )::bigint;
    v_subtotal := v_subtotal + v_total;
  end loop;

  update public.quotes
  set
    title = p_title,
    description = p_description,
    customer_id = p_customer_id,
    valid_until = p_valid_until,
    notes = p_notes,
    subtotal_cents = v_subtotal,
    total_cents = v_subtotal,
    pdf_storage_path = null,
    pdf_generated_at = null
  where id = p_quote_id
    and company_id = p_company_id;

  delete from public.quote_items
  where quote_id = p_quote_id;

  if jsonb_array_length(p_items) > 0 then
    insert into public.quote_items (
      quote_id,
      company_id,
      position,
      description,
      unit,
      quantity,
      unit_price_cents,
      total_cents
    )
    select
      p_quote_id,
      p_company_id,
      row_number() over () - 1,
      item->>'description',
      coalesce(nullif(item->>'unit', ''), 'un'),
      (item->>'quantity')::numeric,
      (item->>'unit_price_cents')::bigint,
      round(
        (item->>'quantity')::numeric * (item->>'unit_price_cents')::numeric
      )::bigint
    from jsonb_array_elements(p_items) item;
  end if;
end;
$$;
