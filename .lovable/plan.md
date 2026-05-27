## Análise da planilha enviada

A planilha "Grupo Luminart – Contábil" implementa uma apuração mensal de impostos no regime **Lucro Presumido** para Luminart Eventos e Luminart Planejados, com a seguinte mecânica:

**Alíquotas (aba Config):**
| Imposto | Base de Cálculo | Alíquota | Adicional |
|---|---|---|---|
| PIS | — | 0,65% | — |
| COFINS | — | 3,00% | — |
| IRPJ | 32% do faturamento | 15% | 10% sobre o que exceder R$ 20.000/mês de lucro presumido |
| CSLL | 32% do faturamento | 9% | — |

**Fluxo de dados:**
1. **Base Emissão de Nota** → NF emitida (nº, evento, empresa, valor) → controla saldo a receber.
2. **Base de Recebimento** → registra recebimentos por nº NF (com data, valor, banco).
3. **Painel** → seleciona Ano + Mês + Empresa → lista recebimentos do mês daquela empresa e calcula automaticamente PIS/COFINS/IRPJ (com adicional) /CSLL sobre o total recebido no mês.
4. **Base de Impostos** → guarda o histórico de impostos apurados pagos (data, competência, empresa, imposto, faturamento, valor).

## O que vou construir

### 1. Remover a barra de abas do topo do módulo Contábil
Atualmente `/contabil` (layout em `src/routes/contabil.tsx`) mostra uma nav horizontal com "Dashboard / Notas / Consulta de impostos / Configuração". A sidebar já expõe os mesmos quatro itens, então a barra superior é redundante. Vou remover apenas a `<nav>`, mantendo o `<Outlet />` e o guard de acesso.

### 2. Aproveitar tabelas existentes (sem migração nova)
- `contabil_notas_fiscais` → já guarda emissão de NF (empresa, número, tomador, valor_bruto, data_emissao, status). Vai virar a **Base de Emissão de Nota**.
- `contabil_configuracao_aliquotas` → já guarda alíquotas por empresa/imposto. Vou popular com os valores corretos do Lucro Presumido (PIS 0,65 / COFINS 3 / IRPJ 15 / CSLL 9) e adicionar campos derivados (base presumida 32%, adicional IRPJ 10% > 20k) calculados em código.
- `contabil_consultas_impostos` → vai ser **transformada** em "Apurações de Impostos" (registro de cada apuração mensal feita), guardando o resultado calculado em `resultado` (JSONB) e o período em `periodo_inicio/fim`.

Vou precisar de **uma migração leve** apenas para:
- Criar `contabil_recebimentos` (nf_id, data_recebimento, valor_recebido, banco, observacoes) – espelhando a "Base de Recebimento" da planilha.
- Acrescentar `numero_evento` / `nome_evento` na `contabil_notas_fiscais` para casar com "ID_Evento" e "Nome Evento" da planilha (campos opcionais).

### 3. Nova tela `/contabil/apuracoes` (renomeia a aba existente "Consulta de impostos" → "Apurações de impostos")
Funcionalidades:
- Filtros: **Ano**, **Mês**, **Empresa**.
- Carrega todos os recebimentos da empresa no mês (via `contabil_recebimentos` + join com `contabil_notas_fiscais`).
- Calcula em tempo real:
  - Faturamento do mês = Σ valor_recebido.
  - PIS = faturamento × alíquota PIS.
  - COFINS = faturamento × alíquota COFINS.
  - Lucro presumido = faturamento × 32%.
  - IRPJ = lucro presumido × 15%.
  - Adicional IRPJ = max(0, lucro presumido − 20.000) × 10%.
  - CSLL = lucro presumido × 9%.
- Mostra duas tabelas:
  1. **NFs / recebimentos do mês** (nº NF, evento, valor recebido).
  2. **Impostos apurados** (imposto, base, alíquota, adicional, total a pagar).
- Botão **"Registrar apuração"** salva o resultado em `contabil_consultas_impostos` para histórico.
- Lista abaixo as apurações já registradas (com botão de excluir).

### 4. Dados de exemplo para medir eficiência
Inserir via tool de insert duas apurações completas baseadas nos números da planilha:

**Exemplo 1 – Luminart Eventos, Março/2026 (faturamento R$ 31.000)**
- PIS R$ 201,50 / COFINS R$ 930,00 / IRPJ R$ 1.488,00 / CSLL R$ 892,80 → Total R$ 3.512,30
- NFs vinculadas: 120 (Casamento Rochele e Anderson – R$ 4.000), 122 (Casamento Marcelina e Anderson – R$ 25.000), 135 (Casamento Juliana e Marcus – R$ 2.000).

**Exemplo 2 – Luminart Eventos, Abril/2026 (faturamento R$ 70.000)**
- Recebimentos: NF 135 (R$ 3.000), NF 120 (R$ 21.000), NF 122 (R$ 25.000), NF 136 (R$ 20.000), NF 137 (R$ 1.000)
- Lucro presumido R$ 22.400 → adicional IRPJ R$ 240 sobre o excedente
- PIS R$ 455 / COFINS R$ 2.100 / IRPJ R$ 3.360 + adicional R$ 240 / CSLL R$ 2.016 → Total R$ 8.171

Esses dois meses permitem comparar a apuração e validar que o cálculo bate com a planilha.

### 5. Configuração de alíquotas (aba existente)
Vou garantir que a aba `/contabil/configuracao` esteja semeada para Luminart Eventos e Luminart Planejados (regime presumido) com PIS 0,65 / COFINS 3 / IRPJ 15 / CSLL 9 – usando o botão "Criar impostos padrão" já existente, ou inserindo via SQL caso não exista.

## Detalhes técnicos

- Arquivos editados:
  - `src/routes/contabil.tsx` – remover a `<nav>` de abas (manter guard + Outlet).
  - `src/routes/contabil.consultas.tsx` → renomear conceitualmente para "Apurações" e reconstruir UI com filtros Ano/Mês/Empresa, cálculo em tempo real, listagem das NFs do mês e botão de registrar apuração.
  - `src/components/AppSidebar.tsx` – renomear o label "Consulta de impostos" → "Apurações de impostos".
  - `src/routes/contabil.notas.tsx` – adicionar campos `numero_evento` e `nome_evento` ao formulário de NF.
- Arquivos criados:
  - `src/routes/contabil.recebimentos.tsx` (nova aba para registrar recebimentos por NF, espelho da "Base de Recebimento").
  - `src/lib/contabil/calculo.ts` – função pura `calcularImpostosPresumido({ faturamento, aliquotas })` com regra do adicional IRPJ (limite R$ 20.000/mês de lucro presumido).
- Migração SQL: criar `contabil_recebimentos` (com RLS `has_module_access('contabil')` + GRANTs) e adicionar duas colunas opcionais em `contabil_notas_fiscais`.
- Seed via `supabase--insert`: 2 apurações de exemplo + NFs e recebimentos correspondentes.

A configuração já existente em `/contabil/configuracao` permite editar alíquotas no futuro; o cálculo lê de lá em tempo real.