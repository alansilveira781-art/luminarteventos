
-- Add evento fields to notas fiscais
ALTER TABLE public.contabil_notas_fiscais
  ADD COLUMN IF NOT EXISTS numero_evento text,
  ADD COLUMN IF NOT EXISTS nome_evento text;

-- Recebimentos por NF
CREATE TABLE IF NOT EXISTS public.contabil_recebimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nota_id uuid REFERENCES public.contabil_notas_fiscais(id) ON DELETE SET NULL,
  numero_nf text,
  empresa text NOT NULL,
  data_recebimento date NOT NULL,
  valor_recebido numeric NOT NULL DEFAULT 0,
  banco text,
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contabil_recebimentos TO authenticated;
GRANT ALL ON public.contabil_recebimentos TO service_role;

ALTER TABLE public.contabil_recebimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contabil module access" ON public.contabil_recebimentos
  FOR ALL TO authenticated
  USING (has_module_access(auth.uid(), 'contabil'))
  WITH CHECK (has_module_access(auth.uid(), 'contabil'));

CREATE INDEX IF NOT EXISTS idx_contabil_recebimentos_data ON public.contabil_recebimentos(empresa, data_recebimento);
CREATE INDEX IF NOT EXISTS idx_contabil_recebimentos_nf ON public.contabil_recebimentos(nota_id);

CREATE TRIGGER contabil_recebimentos_set_updated_at
  BEFORE UPDATE ON public.contabil_recebimentos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
