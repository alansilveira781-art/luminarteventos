## Plano de ajustes — Módulo Estoque

### 1. Entradas com custo médio ponderado
- Adicionar no formulário de **Entrada** os campos: **Custo Unitário**, **Desconto (R$ ou %)**, **Frete**, **IPI**, **Outros Custos** e **Valor Total** (calculado: `(custo_unit × qtd) − desconto + frete + ipi + outros`).
- Persistir esses campos novos na tabela `movimentacoes` (migração: `desconto`, `frete`, `ipi`, `outros_custos`, `valor_total` numéricos).
- Ao salvar a entrada, atualizar o `valor_unitario` do item em `itens` usando **custo médio ponderado**:
  `novo_custo = (estoque_atual × custo_atual + qtd_entrada × custo_unit_efetivo_da_entrada) / (estoque_atual + qtd_entrada)`
  onde `custo_unit_efetivo = valor_total / qtd_entrada`.
- Implementar via trigger `BEFORE INSERT` na `movimentacoes` (tipo=entrada) ou em uma função SQL chamada após o insert do item da movimentação. Usar trigger para garantir consistência mesmo em importações.

### 2. Casas decimais (3+ casas)
- Trocar todos os `step="0.01"` para `step="0.001"` (ou `step="any"`) nos campos de quantidade, valor unitário, custo, desconto etc. nas abas Entradas, Saídas, Devoluções e cadastro de Itens.

### 3. UX dos formulários (Dialogs)
- Aumentar `max-w-3xl` → `max-w-5xl` (ou `max-w-4xl`) nos Dialogs de cadastro de itens, fornecedores, solicitantes, compras.
- Bloquear fechamento ao clicar fora: adicionar `onPointerDownOutside={(e) => e.preventDefault()}` e `onInteractOutside={(e) => e.preventDefault()}` em `DialogContent`. Fechamento só pelo X ou botão Cancelar.

### 4. Sincronização de estoque após cadastro
- Após criar item ou movimentação, invalidar **todas** as queries relevantes (`itens`, `movimentacoes`, e queries derivadas em Saídas) com `qc.invalidateQueries({ queryKey: ["itens"] })` + `refetchQueries`.
- No formulário de saída, garantir que o `select` de itens use a query atualizada (sem cache stale). Adicionar `staleTime: 0` na query de itens da página de saída ou usar `qc.refetchQueries` no submit.

### 5. Busca sem acento (normalização)
- Criar utilitário `normalize(s)` em `src/lib/utils.ts`:
  ```ts
  export const normalize = (s: string) =>
    (s ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  ```
- Aplicar em todos os filtros client-side: itens, fornecedores, solicitantes, compras, devoluções, entradas, saídas.
- Para selects pesquisáveis (`ItemSearchSelect`, `EntitySearchSelect`, `SelectCreatable`), aplicar normalização tanto na query quanto no termo digitado.

### 6. Performance da aba Estoque
- Reduzir delay no carregamento:
  - Manter paginação de 1000 (já existe), mas adicionar `staleTime: 30_000` e `placeholderData: keepPreviousData` na query `["itens"]`.
  - Pré-fetch da query no menu lateral (hover do link Estoque) com `qc.prefetchQuery`.
  - Memoizar `filtered` (já está) e evitar recalculo do sort com chaves estáveis.
  - Lazy-load do `ImportDialog` e `BulkEditDialog` com `React.lazy`.

### 7. Clonar itens
- Adicionar botão **Clonar** (ícone Copy) na linha da tabela de itens, ao lado de Editar.
- Ao clicar, abrir o `ItemForm` pré-preenchido com os dados do item (exceto `id` e `codigo` — código é gerado automaticamente via `generateNextSku()`).
- Reutiliza a mutation de criação existente.

### 8. Totais nos Relatórios
- Em `src/routes/relatorios.tsx`, ao final de cada tabela exportada/visualizada (saídas, entradas, devoluções, estoque), adicionar linha **Total** somando colunas numéricas: `quantidade`, `valor_unitario × quantidade`, `valor_total`.
- Aplicar tanto na visualização em tela quanto na exportação (XLSX/CSV).

### 9. Filtros clicáveis em Saída e Entrada
- Acima da tabela/lista, adicionar dois `Select` (ou `Combobox` pesquisável) clicáveis:
  - **Filtrar por Item** (lista de itens do estoque)
  - **Filtrar por Evento/Projeto** (lista distinct de `evento_projeto` da `movimentacoes`)
- Filtros combinam com a busca de texto existente. Botão **Limpar** ao lado.

---

### Arquivos afetados (resumo técnico)
- **Migração SQL**: `movimentacoes` (novas colunas + trigger de custo médio).
- `src/routes/entradas.tsx` — novos campos, filtros, custo médio na UI.
- `src/routes/saidas.tsx` — filtros, decimais, sincronização.
- `src/routes/devolucoes.tsx` — decimais.
- `src/routes/estoque.index.tsx` — clonar, performance, decimais.
- `src/routes/relatorios.tsx` — linhas de total.
- `src/components/forms/ItemForm.tsx`, `FornecedorForm.tsx`, `SolicitanteForm.tsx` — decimais.
- `src/components/ui/dialog.tsx` (ou cada uso) — bloquear fechamento outside-click; tamanho maior.
- `src/lib/utils.ts` — utilitário `normalize`.
- `src/components/ItemSearchSelect.tsx`, `EntitySearchSelect.tsx`, `SelectCreatable.tsx` — busca sem acento.

### Pontos a confirmar antes de implementar
1. **Desconto na entrada**: em **R$** (valor absoluto) ou **%** sobre o subtotal? (na compra é %, aqui sugiro **R$** para alinhar com Frete/IPI)
2. **Custo médio**: aplicar **somente** quando `quantidade_atual > 0`? Se o estoque estiver zerado, o novo custo é simplesmente o custo da entrada (sem média). Confirmar.
3. **Bloquear fechamento outside-click**: aplicar em **todos** os dialogs do sistema ou só nos formulários de cadastro (Item, Fornecedor, Solicitante, Compra)?
