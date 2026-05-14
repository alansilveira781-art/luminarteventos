
-- Módulo Financeiro
INSERT INTO public.modulos (slug, nome, descricao, rota, icone, ordem, ativo)
VALUES ('financeiro', 'Financeiro', 'Gestão de demandas financeiras', '/financeiro', 'Wallet', 30, true)
ON CONFLICT (slug) DO NOTHING;

-- Sequence para numeração de demandas
CREATE SEQUENCE IF NOT EXISTS public.demandas_numero_seq START 1;

-- Tabela principal: demandas (espelha compras, com descritivo + tipo_demanda livre como text)
CREATE TABLE IF NOT EXISTS public.demandas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero integer DEFAULT nextval('public.demandas_numero_seq'),
  status compra_status NOT NULL DEFAULT 'solicitacao',
  titulo text,
  tipo_demanda text,
  descritivo text,
  solicitante text,
  solicitante_id uuid,
  fornecedor text,
  fornecedor_id uuid,
  documento text,
  comprador text,
  data_solicitacao date NOT NULL DEFAULT CURRENT_DATE,
  data_compra date,
  parcelamento text,
  condicao_pagamento text,
  valor_total numeric,
  observacoes text,
  motivo_negacao text,
  ordem integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.demanda_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demanda_id uuid NOT NULL,
  nome text NOT NULL,
  path text NOT NULL,
  mime_type text,
  tamanho bigint,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.demanda_comentarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demanda_id uuid NOT NULL,
  user_id uuid,
  user_nome text,
  texto text NOT NULL,
  mencoes uuid[] DEFAULT '{}'::uuid[],
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.demanda_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demanda_id uuid NOT NULL,
  user_id uuid,
  user_nome text,
  acao text NOT NULL,
  status_anterior compra_status,
  status_novo compra_status,
  detalhes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.demandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demanda_anexos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demanda_comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demanda_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "financeiro module access" ON public.demandas
  FOR ALL TO authenticated
  USING (has_module_access(auth.uid(), 'financeiro'))
  WITH CHECK (has_module_access(auth.uid(), 'financeiro'));

CREATE POLICY "financeiro module access" ON public.demanda_anexos
  FOR ALL TO authenticated
  USING (has_module_access(auth.uid(), 'financeiro'))
  WITH CHECK (has_module_access(auth.uid(), 'financeiro'));

CREATE POLICY "financeiro module access" ON public.demanda_comentarios
  FOR ALL TO authenticated
  USING (has_module_access(auth.uid(), 'financeiro'))
  WITH CHECK (has_module_access(auth.uid(), 'financeiro'));

CREATE POLICY "financeiro module access" ON public.demanda_historico
  FOR ALL TO authenticated
  USING (has_module_access(auth.uid(), 'financeiro'))
  WITH CHECK (has_module_access(auth.uid(), 'financeiro'));

-- Trigger updated_at
CREATE TRIGGER demandas_set_updated_at
  BEFORE UPDATE ON public.demandas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger histórico de status
CREATE OR REPLACE FUNCTION public.demandas_log_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_nome text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT display_name INTO v_nome FROM public.profiles WHERE id = auth.uid();
    INSERT INTO public.demanda_historico(demanda_id, user_id, user_nome, acao, status_anterior, status_novo)
    VALUES (NEW.id, auth.uid(), v_nome, 'mudou_status', OLD.status, NEW.status);
  ELSIF TG_OP = 'INSERT' THEN
    SELECT display_name INTO v_nome FROM public.profiles WHERE id = auth.uid();
    INSERT INTO public.demanda_historico(demanda_id, user_id, user_nome, acao, status_novo)
    VALUES (NEW.id, auth.uid(), v_nome, 'criou', NEW.status);
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER demandas_log_status
  AFTER INSERT OR UPDATE ON public.demandas
  FOR EACH ROW EXECUTE FUNCTION public.demandas_log_status_change();

-- Storage bucket privado para anexos
INSERT INTO storage.buckets (id, name, public) VALUES ('demanda-anexos', 'demanda-anexos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "demanda anexos read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'demanda-anexos' AND has_module_access(auth.uid(), 'financeiro'));

CREATE POLICY "demanda anexos write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'demanda-anexos' AND has_module_access(auth.uid(), 'financeiro'));

CREATE POLICY "demanda anexos delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'demanda-anexos' AND has_module_access(auth.uid(), 'financeiro'));
