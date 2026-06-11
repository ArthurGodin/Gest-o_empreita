-- Quote revisions keep negotiation history explicit.
-- A revision is a normal quote draft/sent/approved, linked to the rejected
-- quote that originated the change request.

alter table public.quotes
  add column if not exists revision_source_id uuid references public.quotes(id) on delete set null;

create index if not exists quotes_revision_source_idx
  on public.quotes (revision_source_id, created_at desc)
  where revision_source_id is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'quotes_revision_not_self_chk'
      and conrelid = 'public.quotes'::regclass
  ) then
    alter table public.quotes
      add constraint quotes_revision_not_self_chk
      check (revision_source_id is null or revision_source_id <> id);
  end if;
end;
$$;
