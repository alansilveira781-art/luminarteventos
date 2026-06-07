DROP POLICY IF EXISTS "ca_dre_estrutura_select" ON public.ca_dre_estrutura;
DROP POLICY IF EXISTS "Authenticated users can read DRE" ON public.ca_dre_estrutura;
DROP POLICY IF EXISTS "select_ca_dre_estrutura" ON public.ca_dre_estrutura;

CREATE POLICY "ca_dre_estrutura_select_financeiro"
ON public.ca_dre_estrutura
FOR SELECT
TO authenticated
USING (public.has_module_access(auth.uid(), 'financeiro'));