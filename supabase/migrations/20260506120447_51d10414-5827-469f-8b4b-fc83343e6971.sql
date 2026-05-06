
-- =============== ROLES ===============
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(_user_id, 'admin') $$;

-- =============== MODULES ===============
CREATE TABLE public.modulos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  icone TEXT,
  rota TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.modulos ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_modulos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  modulo_id UUID NOT NULL REFERENCES public.modulos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, modulo_id)
);
ALTER TABLE public.user_modulos ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_module_access(_user_id uuid, _slug text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_admin(_user_id) OR EXISTS (
    SELECT 1 FROM public.user_modulos um
    JOIN public.modulos m ON m.id = um.modulo_id
    WHERE um.user_id = _user_id AND m.slug = _slug AND m.ativo = true
  )
$$;

-- profile auto-create
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email))
  ON CONFLICT (id) DO NOTHING;

  -- first user becomes admin
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role='admin') THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_modulos_updated_at BEFORE UPDATE ON public.modulos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============== RLS POLICIES (new tables) ===============
CREATE POLICY "profiles self read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "profiles admin insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) OR id = auth.uid());
CREATE POLICY "profiles admin delete" ON public.profiles FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "user_roles read self or admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "user_roles admin write" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "modulos read auth" ON public.modulos FOR SELECT TO authenticated USING (true);
CREATE POLICY "modulos admin write" ON public.modulos FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "user_modulos read self or admin" ON public.user_modulos FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "user_modulos admin write" ON public.user_modulos FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- =============== REPLACE EXISTING PUBLIC POLICIES ===============
DROP POLICY IF EXISTS "public all itens" ON public.itens;
DROP POLICY IF EXISTS "public all categorias" ON public.categorias;
DROP POLICY IF EXISTS "public all fornecedores" ON public.fornecedores;
DROP POLICY IF EXISTS "public all solicitantes" ON public.solicitantes;
DROP POLICY IF EXISTS "public all movimentacoes" ON public.movimentacoes;
DROP POLICY IF EXISTS "public all movimentacao_itens" ON public.movimentacao_itens;

CREATE POLICY "estoque module access" ON public.itens FOR ALL TO authenticated
  USING (public.has_module_access(auth.uid(), 'estoque'))
  WITH CHECK (public.has_module_access(auth.uid(), 'estoque'));
CREATE POLICY "estoque module access" ON public.categorias FOR ALL TO authenticated
  USING (public.has_module_access(auth.uid(), 'estoque'))
  WITH CHECK (public.has_module_access(auth.uid(), 'estoque'));
CREATE POLICY "estoque module access" ON public.fornecedores FOR ALL TO authenticated
  USING (public.has_module_access(auth.uid(), 'estoque'))
  WITH CHECK (public.has_module_access(auth.uid(), 'estoque'));
CREATE POLICY "estoque module access" ON public.solicitantes FOR ALL TO authenticated
  USING (public.has_module_access(auth.uid(), 'estoque'))
  WITH CHECK (public.has_module_access(auth.uid(), 'estoque'));
CREATE POLICY "estoque module access" ON public.movimentacoes FOR ALL TO authenticated
  USING (public.has_module_access(auth.uid(), 'estoque'))
  WITH CHECK (public.has_module_access(auth.uid(), 'estoque'));
CREATE POLICY "estoque module access" ON public.movimentacao_itens FOR ALL TO authenticated
  USING (public.has_module_access(auth.uid(), 'estoque'))
  WITH CHECK (public.has_module_access(auth.uid(), 'estoque'));

-- =============== SEED DEFAULT MODULE ===============
INSERT INTO public.modulos (slug, nome, descricao, icone, rota, ordem)
VALUES ('estoque', 'Estoque', 'Controle de estoque, entradas, saídas, devoluções e relatórios.', 'Package', '/', 1)
ON CONFLICT (slug) DO NOTHING;

-- =============== STORAGE BUCKET ===============
INSERT INTO storage.buckets (id, name, public) VALUES ('item-photos', 'item-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "item-photos public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'item-photos');
CREATE POLICY "item-photos auth upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'item-photos');
CREATE POLICY "item-photos auth update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'item-photos');
CREATE POLICY "item-photos auth delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'item-photos');
