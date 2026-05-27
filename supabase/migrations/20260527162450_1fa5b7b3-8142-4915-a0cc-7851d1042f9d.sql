
-- Tabela de log de e-mails enviados pelo Comercial
CREATE TABLE public.comercial_email_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id TEXT,
  proposta_id TEXT,
  proposta_numero INTEGER,
  proposta_version INTEGER,
  cliente_email TEXT NOT NULL,
  cliente_nome TEXT,
  template_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  mensagem TEXT,
  pdf_url TEXT,
  pdf_storage_path TEXT,
  status TEXT NOT NULL DEFAULT 'enviado',
  error_message TEXT,
  enviado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  enviado_por_nome TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_comercial_email_log_card_id ON public.comercial_email_log(card_id);
CREATE INDEX idx_comercial_email_log_proposta_id ON public.comercial_email_log(proposta_id);
CREATE INDEX idx_comercial_email_log_created_at ON public.comercial_email_log(created_at DESC);

GRANT SELECT, INSERT ON public.comercial_email_log TO authenticated;
GRANT ALL ON public.comercial_email_log TO service_role;

ALTER TABLE public.comercial_email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comercial pode ler logs de e-mail"
  ON public.comercial_email_log
  FOR SELECT
  TO authenticated
  USING (public.has_module_access(auth.uid(), 'comercial'));

CREATE POLICY "Comercial pode inserir logs de e-mail"
  ON public.comercial_email_log
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_module_access(auth.uid(), 'comercial'));

-- Bucket privado para PDFs de propostas enviadas por e-mail
INSERT INTO storage.buckets (id, name, public)
VALUES ('propostas-pdf', 'propostas-pdf', false)
ON CONFLICT (id) DO NOTHING;

-- Policies de storage: apenas usuários do módulo Comercial podem ler/escrever
CREATE POLICY "Comercial pode ler PDFs de propostas"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'propostas-pdf'
    AND public.has_module_access(auth.uid(), 'comercial')
  );

CREATE POLICY "Comercial pode subir PDFs de propostas"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'propostas-pdf'
    AND public.has_module_access(auth.uid(), 'comercial')
  );

CREATE POLICY "Comercial pode deletar PDFs de propostas"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'propostas-pdf'
    AND public.has_module_access(auth.uid(), 'comercial')
  );
