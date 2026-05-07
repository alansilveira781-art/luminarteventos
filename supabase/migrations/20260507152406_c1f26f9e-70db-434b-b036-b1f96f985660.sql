
CREATE TABLE IF NOT EXISTS public.compras_fornecedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  nome_fantasia text,
  documento text,
  contato_nome text,
  telefone text,
  email text,
  endereco text,
  tipo_fornecimento text,
  status entity_status NOT NULL DEFAULT 'ativo',
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.compras_solicitantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  apelido text,
  setor text,
  cargo text,
  telefone text,
  email text,
  status entity_status NOT NULL DEFAULT 'ativo',
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.compras_fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras_solicitantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "compras_fornecedores module access" ON public.compras_fornecedores
  FOR ALL TO authenticated
  USING (has_module_access(auth.uid(), 'compras') OR has_module_access(auth.uid(), 'estoque'))
  WITH CHECK (has_module_access(auth.uid(), 'compras') OR has_module_access(auth.uid(), 'estoque'));

CREATE POLICY "compras_solicitantes module access" ON public.compras_solicitantes
  FOR ALL TO authenticated
  USING (has_module_access(auth.uid(), 'compras') OR has_module_access(auth.uid(), 'estoque'))
  WITH CHECK (has_module_access(auth.uid(), 'compras') OR has_module_access(auth.uid(), 'estoque'));

CREATE TRIGGER compras_fornecedores_updated_at BEFORE UPDATE ON public.compras_fornecedores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER compras_solicitantes_updated_at BEFORE UPDATE ON public.compras_solicitantes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
