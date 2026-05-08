## Objetivo

1. Adicionar botão de **excluir fornecedor** na aba Fornecedores.
2. Aplicar a UI de **seleção múltipla + edição em massa** (componentes `BulkActionsBar` / `BulkEditDialog` / `useBulkSelection` já criados) nas abas: **Fornecedores, Solicitantes, Estoque, Entradas, Saídas**.

Sem mudanças de banco — só frontend usando o que já existe.

---

## 1. Excluir fornecedor (`src/routes/fornecedores.tsx`)

- Adicionar `useMutation` `del` que faz `supabase.from("fornecedores").delete().eq("id", id)`, com `onSuccess` invalidando `["fornecedores"]` e toast.
- Acrescentar botão `Trash2` (variant ghost, vermelho) ao lado do botão de editar em cada linha, com `confirm("Remover fornecedor X?")`.
- Tratar erro de FK (fornecedor referenciado em movimentações) mostrando mensagem amigável: "Não foi possível excluir: este fornecedor possui movimentações vinculadas. Inative-o em vez de excluir."

---

## 2. Edição em massa por aba

Padrão para todas as abas:
- Importar `useBulkSelection`, `BulkActionsBar`, `BulkEditDialog` (+ tipo `BulkField`, `normalizeBulkPatch`).
- `const sel = useBulkSelection(filtered);`
- Adicionar coluna de checkbox no `<thead>` (com checkbox "selecionar todos") e em cada `<tr>` (parar `onClick` propagation onde existir).
- Renderizar `<BulkActionsBar count={sel.count} onEdit={() => setBulkOpen(true)} onClear={sel.clear} />` acima da tabela.
- `useMutation` `bulkMut`: faz `supabase.from(<tabela>).update(patch).in("id", Array.from(sel.selected))`, invalida queries, toast, fecha diálogo e limpa seleção.
- `<BulkEditDialog open={bulkOpen} count={sel.count} fields={CAMPOS} onSubmit={(p) => bulkMut.mutate(normalizeBulkPatch(p))} />`.

### Campos por aba (apenas campos seguros — não afetam estoque)

**Fornecedores** (`src/routes/fornecedores.tsx`)
- `status` (select: ativo / inativo)
- `tipo_fornecimento` (text)
- `endereco` (text)
- `observacoes` (textarea)

**Solicitantes** (`src/routes/solicitantes.tsx`)
- `status` (select: ativo / inativo)
- `setor` (text)
- `cargo` (text)
- `observacoes` (textarea)

**Estoque** (`src/routes/estoque.index.tsx`) — tabela `itens`
- `categoria` (text)
- `subcategoria` (text)
- `unidade` (text)
- `localizacao` (text)
- `status` (select: disponivel / baixo_estoque / sem_estoque / em_manutencao / inativo)
- `quantidade_minima` (number)
- `valor_unitario` (number)
- `observacoes` (textarea)
- (não inclui `quantidade_atual`)

**Entradas** (`src/routes/entradas.tsx`) — tabela `movimentacoes`, somente metadados
- `fornecedor_id` (select com a lista de fornecedores ativos, allowClear)
- `nota_fiscal` (text)
- `entrada_tipo` (select com `entradaTipoLabels`)
- `responsavel_lancamento` (text)
- `data_movimento` (datetime)
- `observacoes` (textarea)

**Saídas** (`src/routes/saidas.tsx`) — tabela `movimentacoes`, somente metadados
- `solicitante_id` (select com solicitantes ativos, allowClear)
- `saida_tipo` (select com `saidaTipoLabels`, inclui `epi_fardamento`)
- `evento_projeto` (text)
- `finalidade` (text)
- `responsavel_retirada` (text)
- `responsavel_recebimento` (text)
- `data_prevista_devolucao` (date, allowClear)
- `observacoes` (textarea)

---

## Detalhes técnicos

- `applySort` retorna um array novo a cada render; passar para `useBulkSelection` é OK porque o hook deriva `allIds` via `useMemo` sobre `rows`. Mantém a seleção entre re-renders enquanto os IDs continuarem na lista filtrada.
- A coluna de checkbox vai como **primeira** coluna em todas as tabelas; ajustar `colSpan` dos `<td>` "Nenhum…".
- Todas as mutações em massa seguem RLS já existente (`has_module_access`).
- Não mexer na lógica de estoque, triggers ou em qualquer fluxo de criação/edição individual.

## Arquivos afetados
- `src/routes/fornecedores.tsx` (excluir + bulk)
- `src/routes/solicitantes.tsx` (bulk)
- `src/routes/estoque.index.tsx` (bulk)
- `src/routes/entradas.tsx` (bulk)
- `src/routes/saidas.tsx` (bulk)
