
-- Patrimônio: itens
CREATE TABLE public.pat_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cod integer,
  id_item text UNIQUE,
  categoria text,
  subcategoria text,
  data_compra date,
  nome text NOT NULL,
  especificacao text,
  dimensoes text,
  quantidade numeric NOT NULL DEFAULT 1,
  valor numeric NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'BOM',
  unidade text NOT NULL DEFAULT 'UNIDADE',
  localizacao text,
  imagem_url text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pat_itens_categoria ON public.pat_itens(categoria);
CREATE INDEX idx_pat_itens_localizacao ON public.pat_itens(localizacao);
CREATE INDEX idx_pat_itens_nome ON public.pat_itens(nome);

ALTER TABLE public.pat_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patrimonio module access" ON public.pat_itens FOR ALL TO authenticated
  USING (public.has_module_access(auth.uid(), 'patrimonio'))
  WITH CHECK (public.has_module_access(auth.uid(), 'patrimonio'));

CREATE TRIGGER pat_itens_updated_at BEFORE UPDATE ON public.pat_itens
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Patrimônio: movimentações
CREATE TABLE public.pat_movimentacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('entrada','saida','devolucao','ajuste')),
  item_id uuid REFERENCES public.pat_itens(id) ON DELETE SET NULL,
  quantidade numeric NOT NULL DEFAULT 1,
  data_movimento timestamptz NOT NULL DEFAULT now(),
  responsavel text,
  evento_projeto text,
  finalidade text,
  observacoes text,
  condicao text,
  data_prevista_devolucao date,
  saida_origem_id uuid REFERENCES public.pat_movimentacoes(id) ON DELETE SET NULL,
  saida_status text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pat_mov_item ON public.pat_movimentacoes(item_id);
CREATE INDEX idx_pat_mov_tipo ON public.pat_movimentacoes(tipo);
CREATE INDEX idx_pat_mov_data ON public.pat_movimentacoes(data_movimento DESC);

ALTER TABLE public.pat_movimentacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patrimonio module access" ON public.pat_movimentacoes FOR ALL TO authenticated
  USING (public.has_module_access(auth.uid(), 'patrimonio'))
  WITH CHECK (public.has_module_access(auth.uid(), 'patrimonio'));

-- Jurídico: modelos
CREATE TABLE public.juridico_modelos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('corporativo','cenografia','stand','social')),
  nome text NOT NULL,
  corpo_html text NOT NULL DEFAULT '',
  variaveis jsonb NOT NULL DEFAULT '[]'::jsonb,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.juridico_modelos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "juridico module access" ON public.juridico_modelos FOR ALL TO authenticated
  USING (public.has_module_access(auth.uid(), 'juridico'))
  WITH CHECK (public.has_module_access(auth.uid(), 'juridico'));

CREATE TRIGGER juridico_modelos_updated_at BEFORE UPDATE ON public.juridico_modelos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Jurídico: contratos -- guardar texto gerado
ALTER TABLE public.juridico_contratos
  ADD COLUMN IF NOT EXISTS corpo_html text,
  ADD COLUMN IF NOT EXISTS modelo_id uuid REFERENCES public.juridico_modelos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS variaveis_valores jsonb;

-- Cadastrar módulo
INSERT INTO public.modulos (slug, nome, rota, ordem, icone, ativo)
VALUES ('patrimonio', 'Patrimônio', '/patrimonio', 50, 'Boxes', true)
ON CONFLICT (slug) DO NOTHING;
