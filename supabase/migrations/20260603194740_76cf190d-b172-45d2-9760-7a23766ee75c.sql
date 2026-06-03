ALTER TABLE public.ca_sync_log
  ADD COLUMN IF NOT EXISTS date_from date,
  ADD COLUMN IF NOT EXISTS date_to date;

CREATE INDEX IF NOT EXISTS ca_sync_log_recurso_status_from_idx
  ON public.ca_sync_log (recurso, status, date_from);