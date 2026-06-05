-- Bloquear saídas que deixariam estoque negativo
CREATE OR REPLACE FUNCTION public.enforce_stock_on_saida()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $fn$
DECLARE
  v_disp NUMERIC;
  v_nome TEXT;
  v_un TEXT;
  v_tipo movement_kind;
  v_item_id UUID;
  v_qtd NUMERIC;
BEGIN
  IF TG_TABLE_NAME = 'movimentacoes' THEN
    IF NEW.tipo <> 'saida' OR NEW.item_id IS NULL THEN
      RETURN NEW;
    END IF;
    v_item_id := NEW.item_id;
    v_qtd := NEW.quantidade;
  ELSE
    SELECT tipo INTO v_tipo FROM public.movimentacoes WHERE id = NEW.movimentacao_id;
    IF v_tipo IS DISTINCT FROM 'saida'::movement_kind THEN
      RETURN NEW;
    END IF;
    v_item_id := NEW.item_id;
    v_qtd := NEW.quantidade;
  END IF;

  SELECT quantidade_atual, nome, unidade
    INTO v_disp, v_nome, v_un
    FROM public.itens WHERE id = v_item_id;

  IF v_disp IS NULL THEN RETURN NEW; END IF;

  IF v_qtd > v_disp THEN
    RAISE EXCEPTION 'Estoque insuficiente para % (atual: % %, solicitado: % %)',
      v_nome, v_disp, v_un, v_qtd, v_un
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_enforce_stock_on_saida_mov ON public.movimentacoes;
CREATE TRIGGER trg_enforce_stock_on_saida_mov
  BEFORE INSERT ON public.movimentacoes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_stock_on_saida();

-- Garante que esta trigger rode ANTES de apply_movement (ordem alfabética dos nomes)
-- trg_apply_movement < trg_enforce_stock_on_saida_mov, então renomeamos via prefixo:
DROP TRIGGER IF EXISTS trg_enforce_stock_on_saida_mov ON public.movimentacoes;
CREATE TRIGGER trg_a_enforce_stock_on_saida_mov
  BEFORE INSERT ON public.movimentacoes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_stock_on_saida();

DROP TRIGGER IF EXISTS trg_a_enforce_stock_on_saida_item ON public.movimentacao_itens;
CREATE TRIGGER trg_a_enforce_stock_on_saida_item
  BEFORE INSERT ON public.movimentacao_itens
  FOR EACH ROW EXECUTE FUNCTION public.enforce_stock_on_saida();