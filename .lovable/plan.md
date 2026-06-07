## Objetivo

Fazer o DRE/Resumo Gerencial classificar cada lançamento **estritamente pelo prefixo do nome da categoria** do plano de contas (formato `XX - Nome` ou `XXX - Nome`), usando os prefixos cadastrados na tabela `ca_dre_estrutura`. Lançamentos cujo nome de categoria **não tem prefixo reconhecido** são ignorados (não entram em nenhuma linha e não aparecem como "Sem classificação").

## Comportamento

- Para cada conta a pagar/receber:
  1. Lê o `categoria_external_id` → busca o nome no plano de contas.
  2. Extrai o prefixo via regex `^([A-Z]{2,3})\s*-\s*`.
  3. Cruza com os prefixos da estrutura DRE no banco (coluna `prefixos`, por linha).
  4. Se casar, soma na linha; se não casar (ou não houver prefixo), **ignora**.
- Transferências bancárias continuam ignoradas (já são).

## Mudanças

### `src/lib/conta-azul/dre.ts`
- `grupoDoPlanoNome` passa a aceitar um índice de prefixos opcional (vindo da estrutura do banco). Sem índice, mantém o atual como fallback.
- Remover os `NOME_OVERRIDE` (IRRF, ISS, juros pagos, etc.) — usuário pediu para depender só do prefixo. Quem precisar dessas contas em uma linha, ajusta o nome no plano de contas para ter o prefixo correto.
- Função utilitária `buildPrefixIndex(estrutura)` → `Record<string, DreGroupId>`.
- Trocar retorno `"SC"` por `null` quando não há match; `montarDRE` ignora `null` (não soma, não cria linha de "Sem classificação").
- Remover a renderização final do bloco "(?) Sem classificação".

### `src/components/financeiro/ContaAzulDashboard.tsx`
- `calcularDRECaixa` recebe o mesmo índice de prefixos derivado da estrutura do banco e ignora lançamentos sem prefixo reconhecido.
- Remover o bloco que renderiza "Sem classificação" no Painel Financeiro.
- `GROUP_LABEL.SC` deixa de ser usado (pode ficar, mas sem efeito).

### Sem mudanças
- Tabela `ca_dre_estrutura` já tem os prefixos corretos.
- Layout, percentuais, filtros e detalhamento por categoria continuam iguais.
- Transferências bancárias seguem filtradas pela regra atual (nome contém "transferência", etc.).

## Efeito esperado

- A linha "(?) Sem classificação" some.
- Os totais de cada grupo (RB, DR, AC, …) ficam menores ou iguais (lançamentos sem prefixo simplesmente desaparecem do DRE).
- Subtotais calculados (RL, RV, RO, RG, RF, RNO, RN, LU) refletem essa filtragem automaticamente.
