# Reexecutar meses com falha na carga histórica

## Diagnóstico

A carga histórica (jan/2023 → jun/2026) terminou com status **ok**, mas vários meses falharam silenciosamente porque a API do Conta Azul devolveu **503 — "Estamos passando por uma instabilidade"** (visto em `ca_sync_log`). O `processNextHistoricoChunk` engole erros mês a mês (`try{}catch{}`) e avança, então o job marca "concluído" mesmo quando alguns meses não trouxeram nada.

Resultado: existem buracos em `ca_contas_pagar` / `ca_contas_receber` correspondentes aos meses que caíram em 503 (ou outros erros transitórios).

## O que vou fazer

1. **Registrar o mês no log de erro**
   - `ca_sync_log` ganha colunas `date_from` / `date_to` (nullable) preenchidas por `syncContasPagar` / `syncContasReceber` / `syncExtrato`, para sabermos exatamente qual mês falhou.

2. **Endpoint de reprocessamento**
   - Novo `POST /api/contaazul/reprocessar-falhas` (admin do módulo financeiro).
   - Busca em `ca_sync_log` os registros com `status='erro'` dos recursos `contas_pagar`, `contas_receber`, `extrato` dentro de um intervalo `from`/`to` informado, deduplica por (recurso, mês) e roda novamente apenas esses meses. Cada retry chama o mesmo `syncContasPagar(mFrom, mTo)` etc. e gera um novo registro em `ca_sync_log` (ok ou erro).
   - Retorna `{ tentados, sucesso, falhas: [{recurso, mes, mensagem}] }`.

3. **UI na página Conta Azul**
   - Novo card **"Meses com falha"** em `src/routes/financeiro.conta-azul.tsx`:
     - Lista os erros agrupados por (recurso, mês), com a mensagem original.
     - Botão **"Reprocessar todos"** chama o endpoint acima para o intervalo do último job histórico.
     - Botão **"Reprocessar"** por linha (um mês específico).
   - Atualiza após a resposta e mostra toast com o resumo.

4. **(Opcional, mesma migração) Índice**
   - `create index on ca_sync_log (recurso, status, date_from)` para a busca ficar rápida.

## Por que assim e não simplesmente "rodar tudo de novo"

Rodar a carga histórica inteira (42 meses) de novo gasta muitas chamadas à API do Conta Azul, demora minutos e pode bater no mesmo 503. Reprocessar só os meses que falharam é mais rápido, idempotente (upsert por `external_id`, sem duplicar) e te dá visibilidade de quais meses ainda têm gap.

## Arquivos afetados

- `supabase/migrations/*` — adicionar colunas `date_from`/`date_to` em `ca_sync_log` + índice
- `src/lib/conta-azul/sync.server.ts` — gravar mês no log; nova função `reprocessarFalhas(from, to)`
- `src/routes/api/contaazul/reprocessar-falhas.ts` — novo endpoint
- `src/routes/financeiro.conta-azul.tsx` — card "Meses com falha" + ações

## Observação sobre o log antigo

Erros registrados **antes** da migração não têm `date_from`/`date_to`. Para esses, vou tentar extrair o mês da própria URL salva em `mensagem` (regex em `data_vencimento_de=YYYY-MM-DD`) como fallback, para não perder os erros já existentes.
