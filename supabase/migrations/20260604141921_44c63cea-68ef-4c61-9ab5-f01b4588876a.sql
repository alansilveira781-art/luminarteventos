-- 1) Stop broadcasting per-user notifications via Realtime to all subscribers
ALTER PUBLICATION supabase_realtime DROP TABLE public.notificacoes;

-- 2) Scope push_subscriptions policies to authenticated role only (explicit intent)
DROP POLICY IF EXISTS "Users manage their own push subscriptions - select" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users manage their own push subscriptions - insert" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users manage their own push subscriptions - update" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users manage their own push subscriptions - delete" ON public.push_subscriptions;

CREATE POLICY "Users manage their own push subscriptions - select"
  ON public.push_subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users manage their own push subscriptions - insert"
  ON public.push_subscriptions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage their own push subscriptions - update"
  ON public.push_subscriptions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage their own push subscriptions - delete"
  ON public.push_subscriptions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
