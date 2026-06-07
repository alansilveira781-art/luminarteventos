## Problema

O endpoint de **listagem** do Conta Azul (`/contas-a-pagar/buscar` e `/contas-a-receber/buscar`) retorna apenas `id` e `nome` em `centros_de_custo[]` e `categorias[]` — **sem o `valor` ou `percentual` de cada fatia**. Por isso a sincronização atual cai no fallback de divisão igual.

O usuário confirmou que, na origem, cada rateio tem valor próprio (não é divisão igual). Para capturar isso, precisamos consultar o **endpoint de detalhe** de cada lançamento que tem rateio (>=2 centros ou >=2 categorias). Esse endpoint (`GET /financeiro/eventos-financeiros/contas-a-pagar/{id}` e equivalente para receber) retorna o objeto completo com os valores por fatia.

## O que será feito

### 1. Sync — buscar detalhe quando há rateio (`src/lib/conta-azul/sync.server.ts`)

- Após carregar a página de listagem, identificar itens **rateados** (≥2 centros OU ≥2 categorias).
- Para cada item rateado, chamar `GET /financeiro/eventos-financeiros/contas-a-{pagar|receber}/{id}` com **concorrência limitada** (5 em paralelo) para não saturar o rate limit.
- Mesclar o payload de detalhe sobre o item original (preservando campos da listagem) antes de gerar os rateios.
- Em caso de falha individual (404, timeout, 429), registrar em `ca_sync_log` e cair no fallback de divisão igual **apenas** para esse item.
- Adicionar um `probe_rateio_detalhe_{tipo}` (primeira amostra) para confirmar o formato real do payload e ajustar parsers se necessário.

### 2. `buildRateios` — usar os valores reais

- A função já tenta `it.rateios[]`, `it.alocacoes[]` e `centros_de_custo[].valor`. Vamos confirmar via probe qual chave o detalhe traz e ajustar a leitura para priorizar **valor absoluto** (R$) sobre percentual sobre divisão igual.
- Validação: somar `valor` de todas as fatias e comparar com `total`. Se divergir >R$ 0,01, registrar warning em `ca_sync_log` mas persistir os valores reais (a divergência costuma ser arredondamento da própria Conta Azul).

### 3. Backfill

- Após o ajuste, enfileirar reprocessamento completo `2023-01-01 → hoje`. Estimativa: ~45k lançamentos no total, dos quais provavelmente <10% são rateados — o detalhe extra será para algumas milhares de chamadas (executado em background pelo job system existente, sem bloquear a UI).

### 4. Validação

- Confirmar via SQL que o lançamento "Diarias" (id `93d7d295…`) — visto no probe com 3 centros, valor total R$ 700 — agora tem 3 linhas em `ca_lancamento_rateios` com os valores reais retornados pela API (e não 3× R$ 233,33).
- Reabrir o filtro **2026.03.03 - ATIVAÇÃO MANDARA BY YOO** no dashboard e conferir se os valores batem com o que o usuário vê dentro do Conta Azul.

## Fora de escopo

Painel Financeiro, Fluxo de Caixa, DRE, Sync UI, transferências, sinais de cascata — nada disso muda. Só a etapa de coleta de rateios e o backfill.
