CREATE OR REPLACE FUNCTION public.is_module_admin(_user_id uuid, _slug text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.is_admin(_user_id)
      OR (
        _slug = 'estoque' AND EXISTS (
          SELECT 1 FROM public.user_modulos um
          JOIN public.modulos m ON m.id = um.modulo_id
          WHERE um.user_id = _user_id AND m.slug = _slug AND um.is_admin = true AND m.ativo = true
        )
      )
      OR (
        _slug <> 'estoque' AND EXISTS (
          SELECT 1 FROM public.user_modulos um
          JOIN public.modulos m ON m.id = um.modulo_id
          WHERE um.user_id = _user_id AND m.slug = _slug AND m.ativo = true
        )
      )
$function$;