-- Adicionar valor unitário de referência ao item
ALTER TABLE public.itens ADD COLUMN IF NOT EXISTS valor_unitario NUMERIC;

-- Tabela de categorias pré-cadastradas
CREATE TABLE IF NOT EXISTS public.categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public all categorias" ON public.categorias;
CREATE POLICY "public all categorias" ON public.categorias FOR ALL USING (true) WITH CHECK (true);

-- Migrar categorias existentes (texto livre dos itens) para a nova tabela
INSERT INTO public.categorias (nome)
SELECT DISTINCT TRIM(categoria)
FROM public.itens
WHERE categoria IS NOT NULL AND TRIM(categoria) <> ''
ON CONFLICT (nome) DO NOTHING;

-- Tabela de itens de movimentação (vários itens em um único lançamento)
CREATE TABLE IF NOT EXISTS public.movimentacao_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movimentacao_id UUID NOT NULL REFERENCES public.movimentacoes(id) ON DELETE CASCADE,
  item_id UUID NOT NULL,
  quantidade NUMERIC NOT NULL,
  valor_unitario NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_movimentacao_itens_mov ON public.movimentacao_itens(movimentacao_id);
CREATE INDEX IF NOT EXISTS idx_movimentacao_itens_item ON public.movimentacao_itens(item_id);

ALTER TABLE public.movimentacao_itens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public all movimentacao_itens" ON public.movimentacao_itens;
CREATE POLICY "public all movimentacao_itens" ON public.movimentacao_itens FOR ALL USING (true) WITH CHECK (true);