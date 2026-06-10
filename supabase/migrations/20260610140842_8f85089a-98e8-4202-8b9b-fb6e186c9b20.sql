
-- 1) remover trigger duplicada
DROP TRIGGER IF EXISTS trg_itens_updated ON public.itens;

-- 2) função de reconciliação por item
CREATE OR REPLACE FUNCTION public.reconciliar_estoque(p_item_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total numeric := 0;
BEGIN
  -- Movimentações diretas (item_id na própria movimentação)
  SELECT COALESCE(SUM(
    CASE
      WHEN tipo = 'entrada' THEN quantidade
      WHEN tipo = 'saida'   THEN -quantidade
      WHEN tipo = 'ajuste'  THEN quantidade
      WHEN tipo = 'devolucao' AND condicao IN ('perfeito','danificado','quebrado','faltando_peca','em_manutencao')
        THEN quantidade
      ELSE 0
    END
  ), 0)
  INTO v_total
  FROM public.movimentacoes
  WHERE item_id = p_item_id;

  -- Movimentações multi-item via movimentacao_itens
  SELECT v_total + COALESCE(SUM(
    CASE
      WHEN m.tipo = 'entrada' THEN mi.quantidade
      WHEN m.tipo = 'saida'   THEN -mi.quantidade
      WHEN m.tipo = 'ajuste'  THEN mi.quantidade
      WHEN m.tipo = 'devolucao' AND m.condicao IN ('perfeito','danificado','quebrado','faltando_peca','em_manutencao')
        THEN mi.quantidade
      ELSE 0
    END
  ), 0)
  INTO v_total
  FROM public.movimentacao_itens mi
  JOIN public.movimentacoes m ON m.id = mi.movimentacao_id
  WHERE mi.item_id = p_item_id;

  UPDATE public.itens
     SET quantidade_atual = v_total
   WHERE id = p_item_id;

  PERFORM public.refresh_item_status(p_item_id);

  RETURN v_total;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reconciliar_estoque(uuid) TO authenticated;
