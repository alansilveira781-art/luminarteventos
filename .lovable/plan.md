## Diagnóstico

Confirmei no banco e no código:

- Os triggers de estoque (`apply_movement`, `apply_custo_medio_entrada`, `refresh_saida_status`, `apply_movimentacao_item`, `revert_movement_on_delete`, `notify_stock_alert`) estão todos **instalados e ativos** — entradas/saídas/devoluções novas estão atualizando `itens.quantidade_atual` corretamente. Vi isso em movimentos recentes (códigos 78, 389, 863, 2003, etc.).
- Mesmo assim hoje temos:
  - **204 itens com estoque negativo** (somando -55 mil unidades em alguns parafusos).
  - **33 itens com divergência** entre `quantidade_atual` e o que o histórico de movimentos calcula.
  - A grande maioria dos negativos tem **0 entradas registradas e várias saídas** (ex.: código 1133 “PARAFUSO 4x25”: 0 entradas, 3.100 saídas, saldo -3.100). Ou seja, foram lançadas saídas de itens que nunca tiveram entrada — isso aconteceu antes da reativação dos triggers e/ou por digitação manual.
- A regra atual permite saída maior que o disponível (a validação no formulário não impede salvar quando o item é selecionado por outras telas/fluxos).
- O `useEstoqueRealtimeSync` está ativo, então as telas se atualizam entre si.

A boa notícia: o motor (triggers) está sadio. O que precisamos é **limpar o passivo de saldos errados** e **fechar a porta** para novos negativos.

## O que vou fazer

### 1. Relatório dos saldos a corrigir (entregue como CSV)
Gero um arquivo em `/mnt/documents/estoque_a_corrigir.csv` com **todos os 204 itens negativos + os 33 divergentes**, contendo: código, nome, categoria, localização, saldo atual no sistema, saldo calculado pelo histórico, diferença e uma coluna em branco **`saldo_real`** para você preencher.

Você devolve esse arquivo preenchido (mesmo formato) e eu importo para o sistema na etapa 3.

### 2. Bloquear saída que deixaria estoque negativo (banco + UI)
- Migração: nova função `enforce_stock_on_saida()` em `BEFORE INSERT` de `movimentacoes` e `movimentacao_itens`. Se `tipo='saida'` e `quantidade > itens.quantidade_atual`, levanta erro com mensagem clara (`Estoque insuficiente para X. Disponível: Y un`). Isso protege qualquer caminho — formulário, importação, edição, integração.
- Frontend: ajustar `saidas.tsx` para tratar esse erro e exibir o toast amigável (a validação client-side já existe mas é redundante; o banco passa a ser a fonte de verdade).

### 3. Importar os saldos reais (após você devolver o CSV)
Para cada linha com `saldo_real` preenchido, registro um lançamento do tipo **`ajuste`** com a diferença (`saldo_real - quantidade_atual`). Vantagens:
- Não apaga histórico nenhum de entrada/saída.
- O trigger atualiza o saldo automaticamente.
- Fica rastreável no histórico do item como "Ajuste de inventário – correção inicial".

### 4. Recalcular status e tirar drift residual
Depois do ajuste, rodo `refresh_item_status` para todos os itens e uma reconciliação final só nos itens que ainda tiverem divergência (alguns dos 33 são divergências antigas pré-trigger).

## Detalhes técnicos

**Migração nova (`enforce_stock_on_saida`):**

```sql
CREATE OR REPLACE FUNCTION public.enforce_stock_on_saida()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE v_disp NUMERIC; v_nome TEXT; v_un TEXT; v_tipo movement_kind;
BEGIN
  IF TG_TABLE_NAME = 'movimentacoes' THEN
    IF NEW.tipo <> 'saida' OR NEW.item_id IS NULL THEN RETURN NEW; END IF;
  ELSE -- movimentacao_itens
    SELECT tipo INTO v_tipo FROM movimentacoes WHERE id = NEW.movimentacao_id;
    IF v_tipo <> 'saida' THEN RETURN NEW; END IF;
  END IF;
  SELECT quantidade_atual, nome, unidade INTO v_disp, v_nome, v_un
    FROM itens WHERE id = NEW.item_id;
  IF NEW.quantidade > v_disp THEN
    RAISE EXCEPTION 'Estoque insuficiente para % (cód. atual: % %, solicitado: %)',
      v_nome, v_disp, v_un, NEW.quantidade USING ERRCODE='check_violation';
  END IF;
  RETURN NEW;
END $$;
```
Aplica em `BEFORE INSERT` antes de `trg_apply_movement`. Edições existentes continuam funcionando (delete + insert revertem antes de validar).

**Reconciliação final:**
Mesmo padrão do `20260604141400` mas filtrando só itens onde `quantidade_atual <> calculado` E sem ajuste manual recente — para não desfazer correções feitas via CSV.

## Fora de escopo

- Painel Financeiro / DRE / Conta Azul.
- Patrimônio (`pat_*`) — tem motor próprio, não foi reclamado agora.
- Reescrever cadastros de fornecedor/solicitante/cliente — já invalidam queries e estão funcionando; se houver caso específico depois, abordo separadamente.

## Validação que farei após cada etapa

1. Após etapa 2: tentar uma saída maior que o estoque pelo formulário → deve aparecer toast de erro do banco e não gravar.
2. Após etapa 3: rodar a mesma query de divergência — deve voltar **0 itens negativos** e **0 divergências** (exceto itens que você decidiu manter como estão).
3. Conferir 5 itens corrigidos abrindo o histórico em `/estoque/$itemId`.

---

Aprovando este plano, eu já começo pela **etapa 1 (gerar o CSV)** e pela **etapa 2 (bloqueio no banco)** em paralelo — assim você já pode preencher o arquivo enquanto o bloqueio sobe.