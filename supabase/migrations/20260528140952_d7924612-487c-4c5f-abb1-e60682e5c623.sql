CREATE TABLE public.compras_status_defaults (
  status compra_status PRIMARY KEY,
  responsavel_id uuid,
  responsavel_nome text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.compras_status_defaults TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.compras_status_defaults TO authenticated;
GRANT ALL ON public.compras_status_defaults TO service_role;

ALTER TABLE public.compras_status_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "compras_status_defaults read"
  ON public.compras_status_defaults FOR SELECT TO authenticated
  USING (has_module_access(auth.uid(), 'compras') OR has_module_access(auth.uid(), 'estoque'));

CREATE POLICY "compras_status_defaults admin write"
  ON public.compras_status_defaults FOR ALL TO authenticated
  USING (is_module_admin(auth.uid(), 'compras') OR is_admin(auth.uid()))
  WITH CHECK (is_module_admin(auth.uid(), 'compras') OR is_admin(auth.uid()));

CREATE TABLE public.comercial_status_defaults (
  status text PRIMARY KEY,
  responsavel_id uuid,
  responsavel_nome text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.comercial_status_defaults TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.comercial_status_defaults TO authenticated;
GRANT ALL ON public.comercial_status_defaults TO service_role;

ALTER TABLE public.comercial_status_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comercial_status_defaults read"
  ON public.comercial_status_defaults FOR SELECT TO authenticated
  USING (has_module_access(auth.uid(), 'comercial'));

CREATE POLICY "comercial_status_defaults admin write"
  ON public.comercial_status_defaults FOR ALL TO authenticated
  USING (is_module_admin(auth.uid(), 'comercial') OR is_admin(auth.uid()))
  WITH CHECK (is_module_admin(auth.uid(), 'comercial') OR is_admin(auth.uid()));