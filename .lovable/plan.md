
## Objetivo

No módulo Estoque:
1. Cada **lançamento** de entrada ou saída aparece como **uma única linha** na tabela, mesmo quando registra vários itens. Ao clicar para visualizar, mostra todos os itens daquele lançamento.
2. Botão **Duplicar** que abre o formulário pré-preenchido para criar um novo lançamento a partir de um existente.
3. Novo tipo de saída **"EPI / Fardamento"**.
4. **Edição em massa** com checkbox por linha nas abas Entradas, Saídas, Estoque, Fornecedores e Solicitantes.

---

## 1. Mudanças no banco de dados

### 1.1 Reformular a base para lançamento agrupado
- **`movimentacoes`** vira a tabela de **cabeçalho/lançamento** (data, tipo, fornecedor/solicitante, NF, evento, observações, responsável, etc.).
  - Tornar `item_id` e `quantidade` **nullable** (continuam existindo só para compatibilidade com devoluções e dados históricos).
- **`movimentacao_itens`** (já existe) vira a fonte da verdade dos itens de cada lançamento. Adicionar colunas que hoje só existem no cabeçalho e são por-item: nenhuma necessária além das existentes (`item_id`, `quantidade`, `valor_unitario`).
- Migrar o trigger `apply_movement`:
  - Remover do `movimentacoes`.
  - Criar novo trigger em `movimentacao_itens` que aplica entrada/saída/devolução no estoque do item correspondente, lendo `tipo` e `condicao` do cabeçalho.
- **Migração de dados (1‑para‑1)**: para cada `movimentacoes` existente com `item_id`, inserir uma linha em `movimentacao_itens` (sem disparar trigger — usa `session_replication_role` ou flag) preservando o estoque atual.

### 1.2 Novo tipo de saída
- Adicionar valor `epi_fardamento` ao enum `saida_tipo` e ao mapa `saidaTipoLabels` em `src/lib/labels.ts`.

---

## 2. Frontend — Entradas e Saídas

### 2.1 Listagem agrupada
- `src/routes/entradas.tsx` e `src/routes/saidas.tsx`:
  - Query passa a buscar `movimentacoes` (cabeçalho) com `movimentacao_itens(*, item:itens(...))` aninhado.
  - Tabela mostra **uma linha por lançamento**:
    - Coluna **Itens**: "3 itens" (ou nome do item se for só um).
    - **Qtd total** somada dos itens.
    - **Valor total** (soma de qtd × valor_unitario).
    - Demais colunas vêm do cabeçalho (data, fornecedor/solicitante, tipo, NF, evento, status…).
  - Linha expansível (clique abre modal "Detalhes do lançamento" com a lista completa de itens).

### 2.2 Formulário de criação (já é multi-itens) — apenas grava no novo schema
- Insere 1 cabeçalho em `movimentacoes` + N linhas em `movimentacao_itens` (numa transação via RPC ou sequencial).

### 2.3 Edição
- Editar **só metadados do cabeçalho** (data, fornecedor/solicitante, NF, evento, observações, responsável, devolver-até, etc.). Itens permanecem fixos — para alterar itens, o usuário exclui e cria novo (ou duplica e ajusta).
- Mensagem clara no diálogo de edição informando isso.

### 2.4 Duplicar
- Já existe botão `Copy`. Ajustar para carregar o cabeçalho **e todos os itens** do lançamento original como prefill do formulário, permitindo edição antes de salvar como novo lançamento.

### 2.5 Excluir
- Excluir cabeçalho remove em cascata as linhas de `movimentacao_itens` (FK ON DELETE CASCADE) e o trigger reverte o estoque por item.

---

## 3. Edição em massa (Entradas, Saídas, Estoque, Fornecedores, Solicitantes)

### 3.1 UI
- Componente reutilizável `BulkEditBar` + checkbox por linha + checkbox "selecionar todos" no header.
- Quando há ≥1 selecionado, aparece uma barra fixa: "X selecionados • [Editar em massa] [Limpar seleção]".
- Diálogo "Editar em massa" lista apenas os **campos seguros** de cada tabela (nada que afete estoque). Cada campo tem um checkbox "alterar este campo" + o input.

### 3.2 Campos liberados por aba
- **Entradas** (cabeçalho): `fornecedor_id`, `nota_fiscal`, `entrada_tipo`, `responsavel_lancamento`, `observacoes`, `data_movimento`.
- **Saídas** (cabeçalho): `solicitante_id`, `saida_tipo`, `evento_projeto`, `finalidade`, `responsavel_retirada`, `responsavel_recebimento`, `data_prevista_devolucao`, `observacoes`.
- **Estoque** (`itens`): `categoria`, `subcategoria`, `unidade`, `localizacao`, `status`, `quantidade_minima`, `valor_unitario`, `observacoes`. (Não inclui `quantidade_atual`.)
- **Fornecedores**: `status`, `tipo_fornecimento`, `observacoes`, `endereco`.
- **Solicitantes**: `status`, `setor`, `cargo`, `observacoes`.

### 3.3 Persistência
- `UPDATE` em massa via Supabase com `.in("id", ids)` setando apenas os campos marcados.

---

## Detalhes técnicos

- **Migração SQL** (uma só): alter enum `saida_tipo` add `epi_fardamento`; alter `movimentacoes` torna `item_id`/`quantidade` nullable; FK `movimentacao_itens.movimentacao_id` com `ON DELETE CASCADE` (recriar se necessário); novo trigger `apply_movement_item` em `movimentacao_itens AFTER INSERT/UPDATE/DELETE`; `DROP TRIGGER` antigo em `movimentacoes`; backfill 1-para-1 de `movimentacoes` → `movimentacao_itens` com trigger desabilitado para não duplicar estoque.
- **Devoluções** continuam em `movimentacoes` como antes (1 movimento = 1 item por enquanto), referenciando `saida_origem_id` do cabeçalho de saída. A função `refresh_saida_status` é ajustada para somar `quantidade` de todas as linhas da saída-origem (via `movimentacao_itens`).
- **Tipos**: após a migration, `src/integrations/supabase/types.ts` é regenerado; ajusto todos os usos.
- **Componentes novos**: `BulkSelectCheckbox`, `BulkEditBar`, `BulkEditDialog` (recebe schema dos campos editáveis).
- **Sem regressão visual**: filtros, ordenação (SortableTh) e busca permanecem.

## Arquivos afetados (principais)
- `supabase/migrations/<novo>.sql`
- `src/routes/entradas.tsx`, `src/routes/saidas.tsx`, `src/routes/estoque.index.tsx`, `src/routes/fornecedores.tsx`, `src/routes/solicitantes.tsx`, `src/routes/devolucoes.tsx`
- `src/lib/labels.ts`
- Novos: `src/components/BulkEditBar.tsx`, `src/components/BulkEditDialog.tsx`, `src/components/MovimentacaoDetalhesDialog.tsx`
