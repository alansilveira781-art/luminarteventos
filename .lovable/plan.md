# Ajustes — Estoque (Entradas/Saídas/Devoluções)

## 1. Sincronização base ↔ tela (item recém-criado já disponível em Entradas)

**Problema:** após cadastrar um item no Estoque, ao abrir Entradas o item ainda não aparece imediatamente — é preciso recarregar.

**Causa:** quando o item é salvo em `src/routes/estoque.index.tsx`, o `onSuccess` invalida apenas `["itens"]`, mas `entradas.tsx` (e os demais formulários) usam uma queryKey diferente (`["itens-select"]` / `["itens-busca"]`).

**Correção:**
- Em `src/routes/estoque.index.tsx`, no `onSuccess` de criação/edição de item, invalidar também as queries usadas pelos selects de item: `["itens-select"]`, `["itens-busca"]`, `["dashboard-itens"]`.
- Verificar o mesmo em fornecedores (`src/routes/fornecedores.tsx`) e solicitantes (`src/routes/solicitantes.tsx`) — invalidar `["fornecedores-select"]` e `["solicitantes-select"]` após save.
- Em `src/components/ItemSearchSelect.tsx` e `EntitySearchSelect.tsx`, garantir `staleTime: 0` (ou reduzir) para que ao reabrir o formulário a lista seja sempre revalidada.

## 2. Devoluções — busca na "Saída vinculada"

**Hoje:** o campo é um `<Select>` simples com a lista fixa.

**Mudança em `src/routes/devolucoes.tsx` (componente `DevolucaoForm`):**
- Substituir o `<Select>` por um Combobox pesquisável (usando `Command` / `Popover` do shadcn, padrão já usado em `EntitySearchSelect`).
- Cada grupo de saída receberá um número de lançamento curto (ex: `#1234` derivado dos primeiros caracteres do ID, ou usar a ordem cronológica) exibido junto da label.
- Índice de busca por grupo: nome do solicitante + número do lançamento + data formatada (`dd/MM/yyyy`) + nomes dos itens. A função `normalize()` já existente cobre acentos.
- Mantém a seleção atual ao escolher (preserva `handleSelectGrupo`).

## 3. Saídas — remover toggle "Não será devolvido"

**Em `src/routes/saidas.tsx`:**
- Remover a UI adicionada no expandido para marcar item como "não será devolvido" e a mutação `lineStatusMut` que altera `saida_status` por linha.
- A linha da saída volta a se comportar como antes: status muda apenas via devoluções.

## 4. Devoluções — checkbox "Não terá devolução" por item

**Em `src/routes/devolucoes.tsx`, dentro da tabela de itens do `DevolucaoForm`:**
- Adicionar uma coluna `Sem devolução` com `<Checkbox>` por linha (estado local `semDevolucao: Record<string,boolean>`).
- Quando marcado:
  - O input "Devolver agora" é desabilitado e zerado.
  - Ao submeter, para cada item marcado a mutação atualiza diretamente `movimentacoes.saida_status = 'finalizada'` (encerrando o saldo daquele item sem gerar linha de devolução).
- Itens não marcados seguem o fluxo atual (criam linha em `movimentacoes` com `tipo='devolucao'`).
- Permite submissão se houver ao menos um item com qtd > 0 **ou** um item marcado como sem devolução.

### Detalhe técnico do submit (devoluções)

```ts
// para cada item marcado em semDevolucao, atualizar a saída
const idsSem = grupo.itens.filter(s => semDevolucao[s.id]).map(s => s.id);
if (idsSem.length) {
  await supabase.from("movimentacoes")
    .update({ saida_status: "finalizada" })
    .in("id", idsSem);
}
// + insert das linhas de devolução normais (como já é hoje)
```

Após sucesso, invalidar `["saidas"]`, `["saidas-abertas"]`, `["devolucoes"]`.

---

## Arquivos editados
- `src/routes/estoque.index.tsx` — invalidações ampliadas
- `src/routes/fornecedores.tsx` — invalidações ampliadas
- `src/routes/solicitantes.tsx` — invalidações ampliadas
- `src/components/ItemSearchSelect.tsx` / `EntitySearchSelect.tsx` — `staleTime` reduzido
- `src/routes/devolucoes.tsx` — combobox de saída vinculada + checkbox "sem devolução"
- `src/routes/saidas.tsx` — remover toggle "não será devolvido"