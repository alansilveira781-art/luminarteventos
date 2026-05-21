# Plano de performance — backend e frontend

Objetivo: deixar o ERP mais rápido sem mudar comportamento de negócio. Mudanças divididas em 3 frentes.

## 1. Backend (banco de dados)

### 1.1 Índices nas colunas mais consultadas
Migration única adicionando índices `IF NOT EXISTS` (não bloqueante, sem perda de dados):

- `itens`: `codigo`, `codigo_proprio`, `categoria`, `status`, `created_at desc`, `nome` (trigram p/ busca).
- `movimentacoes`: `(tipo, data_movimento desc)`, `item_id`, `fornecedor_id`, `solicitante_id`, `saida_origem_id`, `saida_status`, `created_at desc`, `requisicao_numero`.
- `movimentacao_itens`: `movimentacao_id`, `item_id`.
- `fornecedores`: `documento`, `nome`, `status`.
- `solicitantes`: `nome`, `status`.
- `compras`: `status`, `(status, ordem)`, `created_at desc`, `fornecedor_id`, `solicitante_id`, `numero`.
- `compra_itens`: `compra_id`, `item_id`.
- `pat_itens`: `cod` (único parcial), `categoria`, `created_at desc`.
- `pat_movimentacoes`: `item_id`, `(tipo, data_movimento desc)`, `saida_origem_id`.
- `demandas`: `status`, `created_at desc`.
- `notificacoes`: `(user_id, lida, created_at desc)`.
- `contabil_notas_fiscais`: `(empresa, data_emissao desc)`, `status`.

Habilitar extensão `pg_trgm` para buscas por nome (índices GIN nos campos de texto pesquisados).

### 1.2 Restrição de COD duplicado no patrimônio
Índice único parcial em `pat_itens.cod` (já solicitado em iteração anterior — confirmar presença).

## 2. Backend (queries)

Substituir `select("*")` por listas explícitas de colunas nas listagens das tabelas dos módulos:

- `estoque.index.tsx` — itens: só `id, codigo, codigo_proprio, nome, categoria, unidade, quantidade_atual, quantidade_minima, status, valor_unitario, localizacao, foto_url`.
- `entradas.tsx` / `saidas.tsx` / `devolucoes.tsx` — movimentações: campos exibidos + ids p/ joins; remover `observacoes` longos da listagem (carregar só no detalhe).
- `patrimonio.index.tsx` — pat_itens: omitir `imagem_url` e `observacoes` na listagem (carregar no dialog).
- `compras.index.tsx` — `compras`: omitir `observacoes`, `motivo_negacao` da listagem do kanban.
- `fornecedores.tsx` / `solicitantes.tsx` — listar só campos da tabela.
- Hovers/selects (`ItemSearchSelect`, `EntitySearchSelect`) — manter já enxutos.

Detalhes pesados (observações, anexos, histórico) seguem carregados sob demanda nos dialogs já existentes.

## 3. Frontend

### 3.1 Debounce 300ms
Criar `src/hooks/useDebouncedValue.ts` e aplicar nos inputs de busca/filtro de:
- `estoque.index.tsx`, `entradas.tsx`, `saidas.tsx`, `devolucoes.tsx`, `patrimonio.index.tsx`
- `compras.index.tsx`, `fornecedores.tsx`, `solicitantes.tsx`
- `relatorios.tsx`, `contabil.notas.tsx`, `contabil.consultas.tsx`

O valor exibido no input continua imediato; só o valor usado para filtrar/queryKey é debounced.

### 3.2 Listas grandes — virtualização
Adicionar `@tanstack/react-virtual` e virtualizar o `<TableBody>` quando >100 linhas em:
- estoque, entradas, saídas, devoluções, patrimônio, compras (lista), fornecedores, solicitantes.

Como já há paginação client-side (100/página), a virtualização entra como salvaguarda quando o usuário aumenta o page size ou usa o filtro "ano".

### 3.3 Lazy loading / code splitting
Converter rotas pesadas para `createLazyFileRoute` (split do componente, loader continua crítico):
- `compras.dashboard.tsx`, `patrimonio.dashboard.tsx`, `financeiro.dashboard.tsx`
- `contabil.index.tsx`, `contabil.consultas.tsx`, `contabil.notas.tsx`
- `relatorios.tsx`, `comercial.propostas.tsx`, `comercial.catalogo.tsx`
- `financeiro.rotinas.tsx`, `financeiro.conta-azul.tsx`

Recharts e libs pesadas ficam isoladas no chunk lazy de cada dashboard.

### 3.4 Revisão de re-renders
- Memoizar linhas de tabela pesadas com `React.memo` (`EstoqueRow`, `MovimentacaoRow`, `PatrimonioRow`).
- Estabilizar callbacks com `useCallback` onde passados a filhos memoizados.
- Trocar `useMemo`/derivações que recriam objetos a cada render por valores derivados de queryData direto.
- Mover filtros de período (`PeriodoFilter`) para estado local memoizado; só recalcular `from/to` quando muda o tipo.
- Garantir `queryKey` estável (arrays primitivos), evitando objetos novos a cada render.
- Auditar `staleTime: 0` colocado em iteração anterior nos selects de itens/fornecedores — manter só onde necessário para sincronização imediata (form de entrada/saída logo após cadastro); demais selects voltam a `staleTime` padrão.

## Arquivos afetados (resumo)

Migration: 1 nova (índices + extensão pg_trgm).
Hooks novos: `src/hooks/useDebouncedValue.ts`.
Dependência nova: `@tanstack/react-virtual`.
Componentes/rotas editados: ~18 arquivos listados acima, com edições cirúrgicas (select de colunas, debounce no filtro, memoização de linhas, conversão para lazy route quando aplicável).

## Fora do escopo

- Nenhuma mudança de UI/UX visível.
- Nenhuma mudança em RLS ou regras de negócio.
- Sem alteração nos triggers/funções do banco.
