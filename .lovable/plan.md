## Objetivo

1. Tornar o **DRE detalhado** (todas as linhas + categorias por linha) plenamente visível na aba **Financeiro (Conta Azul) → Painel Financeiro**.
2. **Excluir transferências bancárias** do demonstrativo — elas são apenas movimentação de capital entre contas, não receita nem despesa.

---

## 1. DRE detalhado visível no Painel Financeiro

Hoje a tabela "Demonstrativo" existe, mas tem dois problemas que fazem o detalhe não aparecer bem:

- A área tem `max-h-[520px] overflow-y-auto` e fica em coluna `lg:grid-cols-2` ao lado da lista de movimentos. Com ~25 linhas-pai + 80+ categorias, o usuário não vê o detalhe completo sem rolar.
- O ano default é `new Date().getFullYear()` (2026, sem dados sincronizados ainda), então abre vazio.

Ajustes:

- **Default do ano**: usar o último ano com dados (consulta simples em `ca_contas_receber`/`ca_contas_pagar`) ao invés de `getFullYear()`.
- **Layout do DRE**: mover o card "Demonstrativo" para **largura total** (acima da lista de movimentos, não ao lado). Remover o `max-h` para mostrar todas as linhas e categorias sem rolagem interna.
- **Render detalhado**: garantir 3 níveis visuais — linha-pai (RB, DR, AC…), subtotal calculado (RL, RV, RG…) e detalhes de categoria recuados — já existe na `dre.ts` via `kind: "detail"`, só precisa estilização melhor (recuo + cor mais clara).
- **Linha "Sem classificação"**: continuar exibindo no fim, em destaque, para o usuário poder corrigir o plano de contas.

## 2. Excluir transferências bancárias

A função `isTransferencia()` em `src/lib/conta-azul/dre.ts` hoje só verifica o **nome do plano de contas**. Mas no banco as transferências aparecem como lançamentos em `ca_contas_pagar`/`ca_contas_receber` **sem categoria** (ou com categoria genérica) e identificadas apenas pela **descrição**, ex.:

- "Transferência entre contas"
- "Transferência entre empresas"
- "Ajuste de Saldo para conciliação - Santander"
- "Saldo inicial …"

Plano:

- Estender `isTransferencia()` para também checar a **descrição** do lançamento (não só o nome do plano), usando padrões precisos para **não pegar falsos positivos** como "Transferência do Caminhão" (que é despesa real de documentação veicular).
- Padrões a excluir (regex case-insensitive sobre `descricao`):
  - `^transfer[eê]ncia entre (contas|empresas|bancos)`
  - `^ajuste de saldo`
  - `^saldo inicial`
  - `^aporte` / `^retirada de s[oó]cio.*entre contas` (a confirmar com o usuário se aparecer)
- Aplicar o filtro tanto em `montarDRE` quanto em `totaisExtrato` (este último já filtra por nome de plano; passa a filtrar por descrição também).
- Adicionar um pequeno **card auditável** abaixo do DRE listando: "Transferências bancárias ignoradas no período" com quantidade e valor total, para o usuário conferir que está sendo filtrado corretamente (e poder reportar se algo virou falso positivo/negativo).

## Detalhes técnicos

- `src/lib/conta-azul/dre.ts`:
  - Expandir `isTransferencia(planoNome, descricao?)` para aceitar descrição opcional.
  - Atualizar chamadas em `acumula()` (montarDRE) e em `totaisExtrato()` para passar `c.descricao`.
  - Exportar uma função `transferenciasNoPeriodo(pagar, receber, planos, opts)` que retorna os lançamentos ignorados (para o card auditável).
- `src/components/financeiro/ContaAzulDashboard.tsx` (`PainelFinanceiro`):
  - Query rápida `ca_max_ano` para descobrir o ano mais recente com `data_pagamento` ou `data_vencimento` e usar como default.
  - Reorganizar grid: KPIs → Demonstrativo (full width, sem `max-h`) → Card "Transferências ignoradas" → Card "Movimentos do período" + Conferência vs Extrato.
  - Detail rows com classe `pl-8 text-muted-foreground text-xs`.

## Fora de escopo agora

- Reclassificar categorias com prefixo errado (ex.: "Compra", "Reembolso" caindo em SC). Vou só destacá-las melhor; o ajuste fino do plano de contas é uma próxima etapa quando você apontar quais precisam virar overrides em `NOME_OVERRIDE`.
