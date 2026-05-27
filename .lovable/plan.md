# Dashboard Financeiro com abas Financeiro + Uber

## 1. Navegação por abas

No topo de `/financeiro/dashboard`, acima do título "Dashboard Financeiro", adicionar `Tabs` (shadcn) com 2 entradas: **Financeiro** e **Uber**. A aba muda o conteúdo abaixo sem trocar de rota (estado local + persistência via `?tab=` na URL para deep link).

- Aba **Financeiro**: mantém todo o conteúdo atual (KPIs, gráficos por mês/fornecedor/tipo/status).
- Aba **Uber**: novo painel descrito abaixo.

## 2. Integração Uber for Business

Como você já tem app no developer.uber.com, vou solicitar 3 secrets via `add_secret`:
- `UBER_CLIENT_ID`
- `UBER_CLIENT_SECRET`
- `UBER_ORG_UUID` (UUID da sua organização Business)

### Server function (TanStack)
- `src/lib/uber/auth.server.ts` — pega token OAuth client_credentials em `https://auth.uber.com/oauth/v2/token` com escopo `business.trips`. Cacheia o token em memória até expirar.
- `src/lib/uber/client.server.ts` — wrapper de fetch autenticado.
- `src/lib/uber.functions.ts` — `getUberTrips({ from, to })` que chama `GET /v1/business/trips` (paginado, `limit=50`, segue `next_page`). Sempre executado quando a aba abre (sem cache de DB — "ao abrir a aba" conforme escolhido).
- Período padrão: últimos 24 meses, ajustável pelo seletor De/Até existente.

### Tratamento de erros
Função retorna `{ data, error }` (DTO). UI exibe estado vazio + mensagem se faltar secret, token inválido, ou rate limit.

## 3. Painel Uber (aba)

Layout reusando `Stat` / `ChartCard` já presentes no arquivo:

**KPIs (linha de cards):**
- Gasto total no período
- Nº de corridas
- Ticket médio (gasto / corridas)
- Variação vs período anterior (mesma duração, anterior)

**Gráficos / blocos:**
1. **Gasto mensal** — barras (com linha de comparação ano anterior quando houver).
2. **Comparações** — 3 cards lado a lado:
   - Mês atual vs mês anterior
   - Ano atual vs ano anterior (YTD)
   - Período selecionado vs período imediatamente anterior
3. **Gasto por projeto / centro de custo** — barras horizontais (campo `expense_code` / `expense_memo` da Uber API).
4. **Gasto por tipo de corrida** — pizza (`product_type`: UberX, Black, Comfort etc.).
5. **Top solicitantes** — tabela (nome, nº viagens, total gasto, ticket médio).
6. **Endereços recorrentes** — tabela top 10 (origem ou destino, contagem, % do total). Agrupa por `start_address` e `end_address` normalizados.

Tudo respeita o filtro De/Até do header. Loading com skeletons; vazio com mensagem amigável quando não há dados.

## 4. Arquivos a criar/editar

**Criar:**
- `src/lib/uber/auth.server.ts`
- `src/lib/uber/client.server.ts`
- `src/lib/uber.functions.ts`
- `src/components/financeiro/UberDashboard.tsx`

**Editar:**
- `src/routes/financeiro.dashboard.tsx` — adicionar `Tabs` no topo, mover conteúdo atual para `<TabsContent value="financeiro">`, adicionar `<TabsContent value="uber"><UberDashboard from={from} to={to} /></TabsContent>`. Mudar default de `from` para 24 meses atrás quando a aba Uber está ativa.

## 5. Secrets

Vou disparar `add_secret(["UBER_CLIENT_ID","UBER_CLIENT_SECRET","UBER_ORG_UUID"])` no início da implementação. Você cola os valores; só depois eu sigo escrevendo a integração.

## Observação técnica
A Uber for Business API exige que o app esteja com o escopo `business.trips` aprovado pela Uber. Se a chamada retornar `403 invalid_scope`, será preciso solicitar o escopo no painel do app antes de funcionar — eu trato isso como erro amigável na UI.
