-- ============================================================================
-- Share tokens URL-safe como segmento único de rota
-- ============================================================================
-- Motivo: defaults antigos em base64 podem gerar "/" ou "+". O "/" quebra
-- /q/[token], porque vira separador de rota no Next.js.

begin;

alter table public.quotes
  alter column share_token set default rtrim(
    translate(encode(gen_random_bytes(32), 'base64'), '+/', '-_'),
    '='
  );

create or replace function public.tg_quotes_ensure_share_token()
returns trigger
language plpgsql
as $$
begin
  if new.share_token is null
     or new.share_token !~ '^[A-Za-z0-9_-]{32,}$' then
    new.share_token := rtrim(
      translate(encode(gen_random_bytes(32), 'base64'), '+/', '-_'),
      '='
    );
  end if;
  return new;
end;
$$;

update public.quotes
   set share_token = rtrim(
     translate(encode(gen_random_bytes(32), 'base64'), '+/', '-_'),
     '='
   )
 where share_token is not null
   and share_token !~ '^[A-Za-z0-9_-]{32,}$';

alter table public.quotes
  drop constraint if exists quotes_share_token_url_safe_chk;

alter table public.quotes
  add constraint quotes_share_token_url_safe_chk
  check (share_token is null or share_token ~ '^[A-Za-z0-9_-]{32,}$');

commit;
