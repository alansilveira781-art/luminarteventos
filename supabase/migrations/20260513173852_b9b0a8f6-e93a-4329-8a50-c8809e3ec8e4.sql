-- Adicionar campos de custo na movimentacoes para entradas
ALTER TABLE public.movimentacoes
  ADD COLUMN IF NOT EXISTS desconto numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS frete numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ipi numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS outros_custos numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_total numeric;

-- Trigger: aplica custo médio ponderado no item ao inserir/atualizar entrada
CREATE OR REPLACE FUNCTION public.apply_custo_medio_entrada()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_qtd_atual numeric;
  v_custo_atual numeric;
  v_custo_unit_efetivo numeric;
  v_novo_custo numeric;
  v_qtd_entrada numeric;
BEGIN
  -- Só processa entradas com item_id e quantidade > 0
  IF NEW.tipo <> 'entrada' OR NEW.item_id IS NULL OR COALESCE(NEW.quantidade,0) <= 0 THEN
    RETURN NEW;
  END IF;

  v_qtd_entrada := NEW.quantidade;

  -- custo unit efetivo = valor_total / quantidade (se houver valor_total),
  -- caso contrário usa valor_unitario
  IF NEW.valor_total IS NOT NULL AND NEW.valor_total > 0 THEN
    v_custo_unit_efetivo := NEW.valor_total / v_qtd_entrada;
  ELSIF NEW.valor_unitario IS NOT NULL THEN
    v_custo_unit_efetivo := NEW.valor_unitario;
  ELSE
    RETURN NEW;
  END IF;

  -- Buscar estoque atual e custo atual do item
  -- Importante: o trigger apply_movement já atualizou quantidade_atual.
  -- Então precisamos do estoque ANTES da entrada para o cálculo do custo médio.
  SELECT quantidade_atual - v_qtd_entrada, COALESCE(valor_unitario, 0)
    INTO v_qtd_atual, v_custo_atual
    FROM public.itens
    WHERE id = NEW.item_id;

  IF v_qtd_atual IS NULL THEN RETURN NEW; END IF;

  -- Se estoque anterior <= 0, usa apenas o custo da entrada
  IF v_qtd_atual <= 0 OR v_custo_atual <= 0 THEN
    v_novo_custo := v_custo_unit_efetivo;
  ELSE
    v_novo_custo := (v_qtd_atual * v_custo_atual + v_qtd_entrada * v_custo_unit_efetivo)
                    / (v_qtd_atual + v_qtd_entrada);
  END IF;

  UPDATE public.itens
    SET valor_unitario = ROUND(v_novo_custo::numeric, 4)
    WHERE id = NEW.item_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_custo_medio_entrada ON public.movimentacoes;
CREATE TRIGGER trg_apply_custo_medio_entrada
AFTER INSERT ON public.movimentacoes
FOR EACH ROW
EXECUTE FUNCTION public.apply_custo_medio_entrada();