## Objetivo

Destravar visualização do painel (medida temporária) e coletar evidência empírica de onde a data de baixa aparece no payload do Conta Azul, sem alterar o sync ainda.

## Passo 1 — Fallback temporário no painel (regime de caixa)

Em `src/components/ContaAzulDashboard.tsx`, aplicar `data_pagamento ?? data_vencimento` no filtro de período e no campo `data` da lista, com comentário `// TEMP: regime de caixa exige data_pagamento; fallback enquanto sync não popula a coluna`.

Escopo: APENAS o filtro do list-view. Não tocar no DRE nem nos cards (já usam `data_vencimento` por outra razão).

## Passo 2 — Logs de diagnóstico no sync (sem alterar lógica)

Em `src/lib/conta-azul/sync.server.ts`, dentro do loop de páginas de `ca_contas_pagar` e `ca_contas_receber`:

- (a) Ao encontrar o **primeiro item com `status === 'pago'`** de cada tabela em cada execução, `console.log` do objeto cru completo retornado por `/buscar` (sem `JSON.stringify` filtrado — todas as chaves, marcado com prefixo `[CA-DIAG-LIST]`).
- (b) Para esse mesmo item, fazer **uma chamada extra** a `GET /financeiro/contas-{a-pagar|a-receber}/buscar/{id}` e logar o objeto cru completo com prefixo `[CA-DIAG-DETAIL]`.
- Guard: usar uma flag local (`let loggedPagar = false; let loggedReceber = false`) para garantir exatamente 1 par de logs por tabela por execução — não estourar rate limit.

Não alterar mapeamento nem persistência. Apenas logar.

## Passo 3 — Executar sync de 1 mês

Disparar sync via UI ou server function existente para o mês atual (junho/2026), aguardar conclusão e coletar os 4 logs:
- `[CA-DIAG-LIST]` contas a pagar
- `[CA-DIAG-DETAIL]` contas a pagar
- `[CA-DIAG-LIST]` contas a receber
- `[CA-DIAG-DETAIL]` contas a receber

Usar `stack_modern--server-function-logs` (ou `supabase--edge_function_logs` se o sync rodar como edge function) com filtro `CA-DIAG`.

## Passo 4 — Reporte ao usuário

Apresentar os 4 payloads brutos lado a lado e destacar:
- Quais chaves de data existem na listagem (`data_quitacao`, `data_baixa`, `data_pagamento`, `data_recebimento`, etc.)
- Se a listagem **já tem** a data de baixa → estratégia A (só mapear, sem detalhar 42k registros)
- Se **só o detalhe** tem → estratégia B (precisa decidir entre detalhar tudo com rate-limit, ou só novos/atualizados via incremental)

**Não decidir nem implementar a estratégia do sync nesta rodada.** Aguardar instrução do usuário após ver os payloads.

## Arquivos afetados

- `src/components/ContaAzulDashboard.tsx` — fallback temporário (1 edit pequeno)
- `src/lib/conta-azul/sync.server.ts` — logs de diagnóstico (2 blocos, um por tabela)

Nenhuma migração, nenhuma mudança de schema, nenhuma alteração de mapeamento.
