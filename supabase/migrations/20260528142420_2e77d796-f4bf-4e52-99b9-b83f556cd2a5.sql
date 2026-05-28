-- 1. Fix is_module_admin to require um.is_admin for all non-estoque modules too
CREATE OR REPLACE FUNCTION public.is_module_admin(_user_id uuid, _slug text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.is_admin(_user_id)
      OR EXISTS (
        SELECT 1 FROM public.user_modulos um
        JOIN public.modulos m ON m.id = um.modulo_id
        WHERE um.user_id = _user_id
          AND m.slug = _slug
          AND um.is_admin = true
          AND m.ativo = true
      )
$function$;

-- 2. Restrict item-photos bucket writes to estoque module users
DROP POLICY IF EXISTS "item_photos_insert" ON storage.objects;
DROP POLICY IF EXISTS "item_photos_update" ON storage.objects;
DROP POLICY IF EXISTS "item_photos_delete" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload item photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update item photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete item photos" ON storage.objects;

CREATE POLICY "item_photos_insert_estoque"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'item-photos' AND public.has_module_access(auth.uid(), 'estoque'));

CREATE POLICY "item_photos_update_estoque"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'item-photos' AND public.has_module_access(auth.uid(), 'estoque'))
WITH CHECK (bucket_id = 'item-photos' AND public.has_module_access(auth.uid(), 'estoque'));

CREATE POLICY "item_photos_delete_estoque"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'item-photos' AND public.has_module_access(auth.uid(), 'estoque'));

-- 3. Restrict pat-photos bucket writes to patrimonio module users
DROP POLICY IF EXISTS "pat_photos_insert" ON storage.objects;
DROP POLICY IF EXISTS "pat_photos_update" ON storage.objects;
DROP POLICY IF EXISTS "pat_photos_delete" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload pat photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update pat photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete pat photos" ON storage.objects;

CREATE POLICY "pat_photos_insert_patrimonio"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'pat-photos' AND public.has_module_access(auth.uid(), 'patrimonio'));

CREATE POLICY "pat_photos_update_patrimonio"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'pat-photos' AND public.has_module_access(auth.uid(), 'patrimonio'))
WITH CHECK (bucket_id = 'pat-photos' AND public.has_module_access(auth.uid(), 'patrimonio'));

CREATE POLICY "pat_photos_delete_patrimonio"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'pat-photos' AND public.has_module_access(auth.uid(), 'patrimonio'));

-- 4. Add explicit UPDATE policy for propostas-pdf bucket
DROP POLICY IF EXISTS "propostas_pdf_update" ON storage.objects;

CREATE POLICY "propostas_pdf_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'propostas-pdf' AND public.has_module_access(auth.uid(), 'comercial'))
WITH CHECK (bucket_id = 'propostas-pdf' AND public.has_module_access(auth.uid(), 'comercial'));
