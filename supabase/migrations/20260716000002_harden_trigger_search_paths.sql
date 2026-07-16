-- Trigger functions should never resolve unqualified objects through a
-- caller-controlled search_path, even when they run as security invoker.

alter function public.tg_set_updated_at()
  set search_path = public, pg_temp;
alter function public.tg_quotes_ensure_share_token()
  set search_path = public, pg_temp;
alter function public.tg_recalc_project_progress()
  set search_path = public, pg_temp;
alter function public.tg_touch_project_last_diary()
  set search_path = public, pg_temp;
