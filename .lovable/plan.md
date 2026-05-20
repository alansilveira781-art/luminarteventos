## Patrimônio · Inventário — corrigir campos numéricos

No diálogo de item (`src/routes/patrimonio.index.tsx`, linhas ~459/466), os campos **Quantidade** e **Valor (R$)** usam `<Input type="number" value={f.quantidade ?? 1}>` e `value={f.valor ?? 0}`. Isso força o "0"/"1" a reaparecer quando o usuário apaga, impedindo digitar livremente.

**Solução:** trocar esses dois inputs pelo componente existente `src/components/comercial/NumberInput.tsx`, que mantém um buffer de texto local e permite apagar o campo sem repopular. O valor enviado ao salvar continua sendo `number` (0 quando vazio).

---

## Estoque · paginação e filtro de período

Adicionar nas abas:
- `src/routes/estoque.index.tsx` (Estoque / Itens) — filtrar por `created_at` do item
- `src/routes/entradas.tsx` — filtrar por `data_movimentacao` (ou `created_at`)
- `src/routes/saidas.tsx` — idem
- `src/routes/devolucoes.tsx` — idem

### 1. Filtro de período (componente compartilhado novo)

Criar `src/components/PeriodoFilter.tsx` com um `Select` de presets + `Popover` com dois `Calendar` quando "Personalizado":

- Hoje
- Esta semana (segunda → domingo)
- Este mês
- Este ano
- Personalizado (intervalo de datas via shadcn `Calendar`)
- Todos (sem filtro)

Exporta `{ from, to }` como `Date | null`. Default: **Este mês**.

### 2. Paginação (100 por página)

Criar `src/components/TablePagination.tsx` usando os primitivos shadcn de `src/components/ui/pagination.tsx` (Previous, números com elipses, Next), recebendo `page`, `pageCount`, `onPageChange`.

### 3. Integração em cada aba

Em cada uma das 4 rotas:
- Adicionar `const [periodo, setPeriodo] = useState<{from, to}>(thisMonth)` e `const [page, setPage] = useState(1)`.
- Filtrar o array já existente pelo campo de data adequado dentro do `useMemo` que monta a lista exibida.
- Resetar `page` para 1 sempre que filtros (busca, período, ordenação) mudarem.
- Fatiar a lista: `pageItems = filtered.slice((page-1)*100, page*100)`.
- Renderizar `<PeriodoFilter>` ao lado do campo de busca/header.
- Renderizar `<TablePagination>` abaixo da tabela com `pageCount = Math.ceil(filtered.length / 100)`.
- Contadores existentes (ex.: "X itens") passam a mostrar "exibindo N–M de X".

Observação: a query do Supabase continua trazendo todos os registros (já está paginada internamente em lotes de 1000); a paginação e o filtro de período são aplicados no cliente, mantendo busca, ordenação e seleção em massa funcionando como hoje.

---

## Arquivos alterados/criados

**Novos**
- `src/components/PeriodoFilter.tsx`
- `src/components/TablePagination.tsx`

**Editados**
- `src/routes/patrimonio.index.tsx` (substituir 2 inputs por `NumberInput`)
- `src/routes/estoque.index.tsx`
- `src/routes/entradas.tsx`
- `src/routes/saidas.tsx`
- `src/routes/devolucoes.tsx`
