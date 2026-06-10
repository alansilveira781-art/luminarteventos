## 1) Estoque → Conferência com Egestor

**Onde:** `src/routes/estoque.index.tsx`, no botão **"Nova importação"**.

**Mudança de UX:** transformar o botão atual em um menu (dropdown) com duas opções:
- **Importar itens** (fluxo atual, sem alteração)
- **Conferir estoque (Egestor)** (novo)

**Novo diálogo "Conferir estoque (Egestor)":**
- Upload de planilha `.xlsx` (mesmo componente de upload do `ImportDialog`).
- Parser específico para o arquivo Egestor: o cabeçalho real está na **linha 3** (`Código, Produto, Estoque, Custo, Total, Categoria, Estoque mínimo`); as linhas 1 e 2 são título/data e serão ignoradas.
- **Chave de assimilação:** nome (`Produto` do Egestor ↔ `nome` do item no sistema), comparação normalizada (sem acento, case-insensitive, espaços colapsados). Como fallback, se houver `Código` igual ao `codigo` do sistema, casa por código.
- **Cálculo:** `diferenca = saldo_sistema − saldo_egestor`.

**Resultado em tabela com filtros (chips):**
- Todos
- Divergentes (diferença ≠ 0)
- Apenas no Egestor (item não existe no sistema)
- Apenas no sistema (item ativo, não veio na planilha)

**Colunas da tabela:** Nome · Código sistema · Saldo sistema · Saldo Egestor · Diferença (com cor: verde = 0, vermelho = ≠ 0) · Status.

**Ações:** botão "Exportar divergências (.xlsx)" gerando uma planilha com as linhas filtradas (reaproveitando `xlsx` já presente em `src/lib/import-utils.ts`).

**Observações importantes:**
- A conferência é **apenas leitura** — nenhum saldo é alterado automaticamente. É só comparação.
- Itens inativos no sistema são marcados, mas não contam como divergência por padrão.

**Arquivos:**
- `src/routes/estoque.index.tsx` — trocar o botão por `DropdownMenu` e adicionar estado `conferindo`.
- `src/components/estoque/ConferenciaEgestorDialog.tsx` (novo) — todo o diálogo, parser, comparação e exportação.

---

## 2) Patrimônio → Devoluções → "Responsável recebimento"

**Problema atual:** `src/components/patrimonio/Devolucoes.tsx` (linha 416) usa um `<Input>` livre, sem ligação com a lista de responsáveis.

**Mudança:** substituir esse `<Input>` por um `ComboboxCreatable` alimentado pela mesma fonte usada no formulário de **Saída** (`src/components/patrimonio/Movimentacoes.tsx`, linhas 474-482):

```ts
const { data: solicitantes } = useQuery({
  queryKey: ["solicitantes-select"],
  queryFn: async () => (await supabase.from("solicitantes")
    .select("nome").eq("status", "ativo").order("nome")).data ?? [],
});
const responsavelOptions = useMemo(
  () => Array.from(new Set((solicitantes ?? []).map((s) => s.nome).filter(Boolean))),
  [solicitantes],
);
```

Comportamento: igual ao campo "Responsável" da Saída — permite escolher um solicitante existente ou digitar um nome novo (creatable). Placeholder mantido como "Quem recebeu de volta".

**Arquivo:** apenas `src/components/patrimonio/Devolucoes.tsx`.

---

## Fora de escopo

- Não altero saldos a partir da conferência (sem ajustes automáticos).
- Não mexo em outras telas de importação, no módulo de compras, financeiro ou fluxo de saída de patrimônio.
- Não crio migrations — nenhuma mudança de banco é necessária.
