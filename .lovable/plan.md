# Ajustes - Compras e Estoque

## Módulo Compras

### 1. Card no quadro Kanban
**Arquivo:** `src/routes/compras.index.tsx`
- No componente `Card`, substituir a linha "Solicitada: {data_solicitacao}" por **"Comprada: {data_compra}"** quando houver data, ou **"Não comprado"** quando `data_compra` for nulo.
- Manter os demais campos (título, fornecedor, solicitante, comprador, valor total).

### 2. Anexos dentro do card (CompraDialog)
**Arquivos:** nova migration + `src/components/CompraDialog.tsx`
- **Storage:** criar bucket privado `compra-anexos` via migration, com policies que liberam SELECT/INSERT/DELETE para usuários autenticados com acesso aos módulos `compras` ou `estoque`.
- **Tabela** `compra_anexos`: `id`, `compra_id`, `nome`, `path` (no bucket), `mime_type`, `tamanho`, `uploaded_by`, `created_at`. RLS espelhando a de `compra_itens`.
- **UI:** adicionar uma terceira aba "Anexos" no `Tabs` interno (`dados | itens | anexos`). Disponível apenas após salvar a compra (precisa de `compraId`). Suporta upload múltiplo (pdf, xlsx, jpg, png, etc.), lista os arquivos com nome + tamanho + botão de download (URL assinada) e botão de remover. Drag-and-drop opcional, input `<input type="file" multiple>` é suficiente.

### 3. Desconto % na seção Itens
**Arquivo:** `src/components/CompraDialog.tsx` + tipo `CompraItem` + migration adicionando coluna `desconto_percentual NUMERIC NULL` em `compra_itens`.
- Na grid de itens, adicionar coluna **"Desc. %"** entre Cotação e Valor unit.
- Comportamento: quando o usuário digita um valor em "Cotação" (que passará a aceitar número) **ou** edita o "Desc. %", o `valor_unitario` é **sugerido** automaticamente como `cotacao * (1 - desconto/100)`.
- O campo `valor_unitario` continua editável livremente; a sugestão só sobrescreve quando cotação ou desconto mudam (não quando o usuário digita o valor unit manualmente).
- Persistir `desconto_percentual` no insert/update de `compra_itens`.

> Observação: hoje `cotacao` é `text`. Para preservar dados existentes, manter como `text` e tentar `parseFloat` ao calcular a sugestão; se não for número, não sugere nada.

---

## Módulo Estoque

### 4. Filtro Ano/Mês no Dashboard
**Arquivo:** `src/routes/dashboard.tsx`
- Logo abaixo da frase "Visão geral da operação de estoque Luminart Eventos", adicionar dois `Select`: **Ano** (lista dinâmica a partir das movimentações + ano atual) e **Mês** (1-12 + opção "Todos").
- Aplicar o filtro a todos os cards/queries que usam `data_movimento` (entradas, saídas, devoluções, totais). Cards que mostram fotos/inventário absoluto (estoque atual) permanecem sem filtro.

### 5. Tipos de Saída: separar EPI/Fardamento e adicionar "Produção de Novos Itens"
**Arquivos:** `src/lib/labels.ts` + migration ajustando o enum `saida_tipo`.
- Migration: `ALTER TYPE saida_tipo ADD VALUE 'epi'`, `ADD VALUE 'fardamento'`, `ADD VALUE 'producao_novos_itens'`. Manter `epi_fardamento` no enum por compatibilidade com dados antigos, mas remover do dicionário/dropdown (ou marcar como legado).
- `saidaTipoLabels`: substituir `epi_fardamento` por dois itens (`epi: "EPI"`, `fardamento: "Fardamento"`) e adicionar `producao_novos_itens: "Produção de Novos Itens"`.
- Atualizar dropdowns em `src/routes/saidas.tsx` (form e filtros) e qualquer label exibido em relatórios.

### 6. Devoluções: solicitantes pesquisáveis
**Arquivo:** `src/routes/devolucoes.tsx`
- Substituir os Inputs livres dos campos **"Responsável pela devolução"** e **"Responsável pelo recebimento"** por um combobox baseado em `EntitySearchSelect` (ou `SelectCreatable`) ligado à tabela `solicitantes`, permitindo digitar para filtrar e também escrever um nome novo livre, salvando o texto exibido em `responsavel_retirada` / `responsavel_recebimento`.

### 7. Devoluções: paridade com Saídas/Entradas
**Arquivo:** `src/routes/devolucoes.tsx`
- Adicionar barra de filtros idêntica à de Saídas (período, busca, status, etc., conforme aplicável).
- Habilitar seleção em massa (checkbox por linha + checkbox no header) usando `useBulkSelection`.
- `BulkActionsBar` com ações: editar metadados em massa (observações, data, responsáveis) via `BulkEditDialog` e excluir devoluções selecionadas (com confirmação e revert de estoque pelo trigger existente).
- Habilitar exclusão individual (botão lixeira em cada linha).

### 8. Hover de informações do item em Saídas e Entradas
**Arquivos:** `src/components/ItemSearchSelect.tsx` (ou wrapper local) + `src/routes/saidas.tsx` + `src/routes/entradas.tsx`
- Ao lado do item selecionado no formulário, adicionar um ícone **olho** (`Eye` do lucide). Usar `HoverCard` (já existe em `components/ui/hover-card.tsx`) que ao passar o mouse mostra: nome completo, código, código próprio, categoria, subcategoria, unidade, quantidade atual, quantidade mínima, localização, status, valor unitário, descrição, observações.
- Texto pequeno (`text-xs`) mas legível; layout em duas colunas dentro do hover card.

### 9. Lista de Fornecedores em Entrada com CNPJ
**Arquivo:** `src/routes/entradas.tsx` (e o componente de seleção de fornecedor utilizado, provavelmente `EntitySearchSelect` ou `SelectCreatable`)
- No dropdown de fornecedores do formulário de Entrada, abaixo do nome exibir o `documento` (CNPJ/CPF) em `text-[11px] text-muted-foreground/70` (transparente porém legível).
- Buscar `documento` na query de fornecedores (já existe em `compras-fornecedores-min`; aqui usar `fornecedores`). Garantir que a busca por digitação também combine com o documento.

---

## Ordem de execução
1. Migrations (enum saida_tipo, tabela compra_anexos + bucket, coluna desconto_percentual).
2. Compras: card kanban, desconto%, anexos.
3. Estoque: labels/tipos, dashboard filtros, hover info, fornecedor com CNPJ.
4. Devoluções: solicitantes pesquisáveis, filtros, seleção em massa, exclusão.

## Arquivos afetados
- `supabase/migrations/<novo>.sql` (3 mudanças combinadas ou separadas)
- `src/routes/compras.index.tsx`
- `src/components/CompraDialog.tsx`
- `src/routes/dashboard.tsx`
- `src/lib/labels.ts`
- `src/routes/saidas.tsx`
- `src/routes/entradas.tsx`
- `src/routes/devolucoes.tsx`
- `src/components/ItemSearchSelect.tsx` (ou novo componente `ItemHoverInfo.tsx`)
- possivelmente `src/components/EntitySearchSelect.tsx` para suportar segunda linha (CNPJ)
