-- Add plan column for soft paywall
alter table public.companies 
add column plan text not null default 'free';
