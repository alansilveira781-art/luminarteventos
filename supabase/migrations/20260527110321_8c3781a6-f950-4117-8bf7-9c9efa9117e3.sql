ALTER TABLE public.contabil_configuracao_aliquotas
  ADD COLUMN IF NOT EXISTS base_calculo NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS aliquota_adicional NUMERIC NOT NULL DEFAULT 0;