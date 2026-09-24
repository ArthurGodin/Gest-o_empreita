-- Aggregate the full tenant ledger in Postgres; return only the rows rendered by
-- the dashboard. SECURITY INVOKER keeps every source table's RLS in force.
create or replace function public.get_finance_overview(p_company_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  with quote_totals as (
    select
      coalesce(sum(total_cents) filter (where status = 'approved'), 0) as approved,
      coalesce(sum(total_cents) filter (where status in ('sent', 'viewed')
        and (valid_until is null or valid_until >= (now() at time zone 'America/Sao_Paulo')::date)), 0) as pending,
      coalesce(sum(total_cents) filter (where status = 'approved' and project_id is null), 0) as unlinked
    from public.quotes where company_id = p_company_id
  ), approved_by_project as (
    select project_id, sum(total_cents) as amount
    from public.quotes
    where company_id = p_company_id and status = 'approved' and project_id is not null
    group by project_id
  ), cost_by_project as (
    select project_id, sum(amount_cents) as amount
    from public.project_costs where company_id = p_company_id
    group by project_id
  ), cost_totals as (
    select
      coalesce(sum(amount_cents), 0) as total,
      coalesce(sum(amount_cents) filter (where category = 'material'), 0) as material,
      coalesce(sum(amount_cents) filter (where category = 'labor'), 0) as labor,
      coalesce(sum(amount_cents) filter (where category = 'freight'), 0) as freight,
      coalesce(sum(amount_cents) filter (where category = 'other'), 0) as other
    from public.project_costs where company_id = p_company_id
  ), charge_totals as (
    select
      coalesce(sum(amount_cents) filter (where status in ('received', 'confirmed')), 0) as received,
      coalesce(sum(amount_cents) filter (where status in ('pending', 'draft')), 0) as pending,
      coalesce(sum(amount_cents) filter (where status = 'overdue'), 0) as overdue
    from public.billing_charges where company_id = p_company_id
  ), project_totals as (
    select coalesce(sum(budget_cents) filter (where status in ('planning', 'in_progress', 'paused')), 0) as open_budget
    from public.projects where company_id = p_company_id
  ), top_projects as (
    select p.id, p.name, p.status, c.name as customer_name, p.budget_cents,
      coalesce(a.amount, 0) as approved_revenue_cents,
      coalesce(k.amount, 0) as cost_cents,
      case when coalesce(nullif(a.amount, 0), p.budget_cents, 0) > 0
        then coalesce(nullif(a.amount, 0), p.budget_cents) - coalesce(k.amount, 0)
        else null end as margin_cents,
      case when coalesce(nullif(a.amount, 0), p.budget_cents, 0) > 0
        then round(100.0 * (coalesce(nullif(a.amount, 0), p.budget_cents) - coalesce(k.amount, 0))
          / coalesce(nullif(a.amount, 0), p.budget_cents), 2)
        else null end as margin_pct,
      p.updated_at
    from public.projects p
    left join public.customers c on c.id = p.customer_id and c.company_id = p_company_id
    left join approved_by_project a on a.project_id = p.id
    left join cost_by_project k on k.project_id = p.id
    where p.company_id = p_company_id
      and (coalesce(a.amount, 0) > 0 or coalesce(k.amount, 0) > 0 or p.budget_cents is not null)
    order by coalesce(nullif(a.amount, 0), p.budget_cents, 0) desc, p.id
    limit 10
  ), top_charges as (
    select b.id, b.project_id, p.name as project_name, c.name as customer_name,
      b.kind, b.status, b.payment_provider, b.amount_cents, b.due_date, b.paid_at, b.created_at
    from public.billing_charges b
    left join public.projects p on p.id = b.project_id and p.company_id = p_company_id
    left join public.customers c on c.id = b.customer_id and c.company_id = p_company_id
    where b.company_id = p_company_id
    order by b.created_at desc, b.id desc
    limit 10
  ), top_costs as (
    select k.id, k.project_id, k.category, k.description, k.amount_cents,
      k.incurred_on, k.created_at, p.name as project_name
    from public.project_costs k
    left join public.projects p on p.id = k.project_id and p.company_id = p_company_id
    where k.company_id = p_company_id
    order by k.incurred_on desc, k.created_at desc, k.id desc
    limit 8
  )
  select jsonb_build_object(
    'approved_revenue_cents', q.approved,
    'open_budget_cents', p.open_budget,
    'cost_cents', k.total,
    'margin_cents', q.approved - k.total,
    'pending_quote_cents', q.pending,
    'approved_without_project_cents', q.unlinked,
    'received_charge_cents', b.received,
    'pending_charge_cents', b.pending,
    'overdue_charge_cents', b.overdue,
    'costs_by_category', jsonb_build_object('material', k.material, 'labor', k.labor, 'freight', k.freight, 'other', k.other),
    'project_rows', (select coalesce(jsonb_agg(to_jsonb(x) order by coalesce(nullif(x.approved_revenue_cents, 0), x.budget_cents, 0) desc, x.id), '[]'::jsonb) from top_projects x),
    'charge_rows', (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc, x.id desc), '[]'::jsonb) from top_charges x),
    'recent_costs', (select coalesce(jsonb_agg(to_jsonb(x) order by x.incurred_on desc, x.created_at desc, x.id desc), '[]'::jsonb) from top_costs x)
  )
  from quote_totals q, cost_totals k, charge_totals b, project_totals p
  where exists (
    select 1 from public.company_members m
    where m.company_id = p_company_id and m.user_id = auth.uid()
  );
$$;

revoke execute on function public.get_finance_overview(uuid) from public, anon;
grant execute on function public.get_finance_overview(uuid) to authenticated;

create index if not exists project_costs_company_recent_idx
  on public.project_costs(company_id, incurred_on desc, created_at desc);
create index if not exists billing_charges_company_recent_idx
  on public.billing_charges(company_id, created_at desc);

-- Maintenance-only capacity signal for the unattended SINAPI importer.
create or replace function public.get_sinapi_database_size()
returns bigint
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select pg_database_size(current_database());
$$;
revoke execute on function public.get_sinapi_database_size() from public, anon, authenticated;
grant execute on function public.get_sinapi_database_size() to service_role;
