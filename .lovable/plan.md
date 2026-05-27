# Corrigir integração Uber Business

## Diagnóstico

O erro `400 invalid_scope` vem do `POST https://auth.uber.com/oauth/v2/token` porque pedimos `scope=business.trips`, mas:

1. A documentação oficial ([Receipts API → Authentication](https://developer.uber.com/docs/businesses/receipts/guides/authentication)) usa o escopo **`business.receipts`** para `client_credentials`.
2. O escopo `business.trips` existe, mas pertence à **Employees Trips API** (`POST /v1/trips/search`) e precisa estar **explicitamente habilitado no painel do app** em developer.uber.com → Apps → Auth → Scopes. Se não estiver habilitado, o servidor responde exatamente com `invalid_scope`.
3. O endpoint atual no nosso código (`GET /v1/business/trips`) **não existe** na API pública atual. O que existe é:
   - `POST /v1/trips/search` (escopo `business.trips`) — lista trips paginadas, **este é o que queremos**.
   - `GET /v1/business/trips/{trip_id}/receipt` (escopo `business.receipts`) — recibo único, marcado como **deprecated**.

Ou seja, temos dois bugs combinados: escopo errado **e** endpoint inexistente.

## Pergunta antes de implementar

Precisamos saber quais escopos estão marcados como "Approved" no painel do seu app Uber (developer.uber.com → seu app → Auth → OAuth Scopes). As duas opções abaixo decidem o caminho:

- **Opção A — `business.trips` aprovado**: caminho ideal. Conseguimos listar todas as trips da organização com um único endpoint e montar todos os gráficos do dashboard.
- **Opção B — apenas `business.receipts` aprovado**: API Receipts só entrega recibo trip-a-trip a partir de um `trip_id` que você já tem (ex.: via webhook). Não dá pra listar viagens só com client_credentials. Nesse caso precisaríamos configurar webhook `trips.receipt.ready` + tabela no banco pra armazenar histórico — escopo bem maior.

Confirma qual está habilitado? Se não tiver certeza, mande print da seção "OAuth Scopes" do app.

## Mudanças (assumindo Opção A)

### `src/lib/uber/auth.server.ts`
- Trocar `scope: "business.trips"` — manter, **mas** garantir que o app realmente tenha esse escopo aprovado.
- Mensagem de erro mais explícita quando vier `invalid_scope`: instruir o usuário a habilitar o escopo no painel.

### `src/lib/uber.functions.ts`
Reescrever `getUberTrips` para usar `POST /v1/trips/search`:

```ts
const res = await fetch("https://api.uber.com/v1/trips/search", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "Accept-Language": "pt-BR",
  },
  body: JSON.stringify({
    third_party_customer_organization_id: orgUuid,
    search_filters: {
      interval: { starts_at: fromMs, ends_at: toMs },
    },
    paging_option: { page_size: 50, cursor: nextCursor ?? undefined },
  }),
});
```

- Paginação por cursor (`paging_option.cursor` / `response.next_cursor`) em vez de offset.
- Ajustar `normalize()` para o shape real do response (`trips[].fare_breakdown.total`, `trips[].vehicle_view_name`, `trips[].rider.{name,email}`, `trips[].request_time_ms`, etc.) — mantendo o DTO `UberTrip` já consumido pela UI.
- Manter retorno `{ trips, error }` com tratamento amigável para 401/403/invalid_scope.

### UI (`UberDashboard.tsx`)
Sem mudanças — o componente consome o DTO normalizado.

### Se for Opção B
Mudo o plano: troco para `scope: "business.receipts"`, removo o fetch de listagem, e proponho separadamente o caminho webhook + persistência. Não implemento sem confirmar.

## Próximo passo

Me confirma quais escopos o app tem aprovados no painel (ou peça pra habilitar `business.trips` lá) e eu sigo com a Opção A.
