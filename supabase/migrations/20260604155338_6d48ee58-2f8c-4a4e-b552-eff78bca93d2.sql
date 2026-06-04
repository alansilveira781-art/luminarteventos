
-- 1) Triggers em movimentacoes
DROP TRIGGER IF EXISTS trg_apply_movement ON public.movimentacoes;
CREATE TRIGGER trg_apply_movement
  BEFORE INSERT ON public.movimentacoes
  FOR EACH ROW EXECUTE FUNCTION public.apply_movement();

DROP TRIGGER IF EXISTS trg_apply_custo_medio_entrada ON public.movimentacoes;
CREATE TRIGGER trg_apply_custo_medio_entrada
  AFTER INSERT ON public.movimentacoes
  FOR EACH ROW EXECUTE FUNCTION public.apply_custo_medio_entrada();

DROP TRIGGER IF EXISTS trg_refresh_saida_status ON public.movimentacoes;
CREATE TRIGGER trg_refresh_saida_status
  AFTER INSERT ON public.movimentacoes
  FOR EACH ROW EXECUTE FUNCTION public.refresh_saida_status();

DROP TRIGGER IF EXISTS trg_revert_movement_on_delete ON public.movimentacoes;
CREATE TRIGGER trg_revert_movement_on_delete
  BEFORE DELETE ON public.movimentacoes
  FOR EACH ROW EXECUTE FUNCTION public.revert_movement_on_delete();

-- 2) Triggers em movimentacao_itens (multi-item)
DROP TRIGGER IF EXISTS trg_apply_movimentacao_item ON public.movimentacao_itens;
CREATE TRIGGER trg_apply_movimentacao_item
  AFTER INSERT OR UPDATE OR DELETE ON public.movimentacao_itens
  FOR EACH ROW EXECUTE FUNCTION public.apply_movimentacao_item();

-- 3) Trigger em itens para alertas de estoque
DROP TRIGGER IF EXISTS trg_notify_stock_alert ON public.itens;
CREATE TRIGGER trg_notify_stock_alert
  AFTER UPDATE OF status ON public.itens
  FOR EACH ROW EXECUTE FUNCTION public.notify_stock_alert();

-- 4) Updated_at em itens
DROP TRIGGER IF EXISTS trg_itens_set_updated_at ON public.itens;
CREATE TRIGGER trg_itens_set_updated_at
  BEFORE UPDATE ON public.itens
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5) Reconciliação: recalcular quantidade_atual com base no histórico
WITH agg_simple AS (
  SELECT item_id,
    SUM(CASE
      WHEN tipo='entrada' THEN quantidade
      WHEN tipo='saida' THEN -quantidade
      WHEN tipo='ajuste' THEN quantidade
      WHEN tipo='devolucao' AND condicao IN ('perfeito','danificado','quebrado','faltando_peca','em_manutencao') THEN quantidade
      ELSE 0
    END)::numeric AS total
  FROM public.movimentacoes
  WHERE item_id IS NOT NULL
  GROUP BY item_id
),
agg_multi AS (
  SELECT mi.item_id,
    SUM(CASE
      WHEN m.tipo='entrada' THEN mi.quantidade
      WHEN m.tipo='saida' THEN -mi.quantidade
      WHEN m.tipo='ajuste' THEN mi.quantidade
      WHEN m.tipo='devolucao' AND m.condicao IN ('perfeito','danificado','quebrado','faltando_peca','em_manutencao') THEN mi.quantidade
      ELSE 0
    END)::numeric AS total
  FROM public.movimentacao_itens mi
  JOIN public.movimentacoes m ON m.id = mi.movimentacao_id
  GROUP BY mi.item_id
),
totals AS (
  SELECT item_id, SUM(total) AS total FROM (
    SELECT * FROM agg_simple UNION ALL SELECT * FROM agg_multi
  ) s GROUP BY item_id
)
UPDATE public.itens i
  SET quantidade_atual = COALESCE(t.total, 0)
  FROM totals t
  WHERE t.item_id = i.id;

-- itens sem nenhuma movimentação ficam com 0
UPDATE public.itens i
  SET quantidade_atual = 0
  WHERE NOT EXISTS (SELECT 1 FROM public.movimentacoes m WHERE m.item_id = i.id)
    AND NOT EXISTS (SELECT 1 FROM public.movimentacao_itens mi WHERE mi.item_id = i.id);

-- recalcular status para todos (exceto em_manutencao/inativo, que refresh_item_status já preserva)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.itens LOOP
    PERFORM public.refresh_item_status(r.id);
  END LOOP;
END $$;

-- 6) Realtime: incluir movimentacao_itens para sincronizar lançamentos multi-item
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='movimentacao_itens'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.movimentacao_itens';
  END IF;
END $$;

ALTER TABLE public.movimentacao_itens REPLICA IDENTITY FULL;
ALTER TABLE public.itens REPLICA IDENTITY FULL;
ALTER TABLE public.movimentacoes REPLICA IDENTITY FULL;
