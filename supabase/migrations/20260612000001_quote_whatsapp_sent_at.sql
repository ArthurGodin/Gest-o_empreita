alter table public.quotes
  add column if not exists whatsapp_sent_at timestamptz;
