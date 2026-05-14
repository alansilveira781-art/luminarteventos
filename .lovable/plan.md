## 1. Anexos liberados na criação da demanda

Hoje a aba **Anexos** só aparece depois de salvar (mostra a mensagem *"Salve a demanda para anexar arquivos"*). Vou mudar para que seja possível anexar arquivos já durante a criação:

- Quando a demanda ainda não tem `id`, os arquivos selecionados ficam guardados em memória (lista de pendentes com nome, tipo e tamanho).
- Ao salvar a demanda pela primeira vez, o sistema cria a demanda, faz o upload dos arquivos pendentes para o bucket `demanda-anexos` e registra cada um na tabela `demanda_anexos`.
- Para demandas já salvas, o comportamento continua igual (upload imediato).

Isso mantém a segurança (nada vai pro storage antes de existir uma demanda) e dá a sensação de que o anexo já está "liberado" desde o início.

## 2. Renomear/reordenar as colunas do Quadro de Demandas

O módulo Financeiro hoje reaproveita os status do módulo de Compras (`src/lib/demandas.ts` re-exporta de `compras.ts`). Vou separar: criar uma lista própria de status só para demandas, sem afetar Compras.

Novas colunas, nesta ordem:

1. Solicitação de Demanda
2. Análise
3. Pendente Aprovação
4. Demanda Aprovada
5. Demanda Em Andamento
6. Finalizado
7. Demanda Negada

Mapeamento para os valores já existentes no banco (a coluna `demandas.status` continua usando o enum `compra_status`, sem migração):

| Coluna nova | Valor no banco |
|---|---|
| Solicitação de Demanda | `solicitacao` |
| Análise | `analise` |
| Pendente Aprovação | `pendente_aprovacao` |
| Demanda Aprovada | `aprovada` |
| Demanda Em Andamento | `em_andamento` |
| Finalizado | `finalizado` |
| Demanda Negada | `negada` |

A coluna "Compras a Receber" (`a_receber`) some do quadro de Demandas (não faz sentido aqui). Demandas antigas que estiverem nesse status — se houver — vão aparecer apenas na busca, com aviso visual; podemos migrá-las depois se quiser.

## 3. Formulário "estilo app" para entrada de Compras e Demandas

A ideia é ter um ambiente de entrada simplificado onde a pessoa escolhe **Compra** ou **Demanda**, preenche os mesmos campos do sistema, e o registro cai automaticamente como card na coluna **Solicitação de Compra** (módulo Compras) ou **Solicitação de Demanda** (módulo Financeiro).

Antes de eu escolher o caminho, preciso entender duas coisas:

**a) Quem usa esse formulário?**
- *Opção A — Interno:* só pessoas já cadastradas no sistema. Faço uma rota nova tipo `/solicitar` (ou um botão flutuante "Nova solicitação" no topo) que abre um wizard curto: passo 1 escolhe o tipo, passo 2 mostra os campos do sistema, salva direto na tabela `compras` ou `demandas` com status `solicitacao`. Sem mudança de banco, sem login extra.
- *Opção B — Público (link compartilhável):* qualquer pessoa com o link consegue enviar, mesmo sem conta. Isso exige uma rota pública (`/api/public/solicitar` ou página `/solicitar-publico`), regras de RLS específicas (uma policy de INSERT pública só para status `solicitacao`), e idealmente um campo de identificação (nome/email do solicitante externo) e algum anti-spam (rate limit, captcha leve, ou token na URL).

**b) Formato do formulário:**
- Wizard em passos (1. tipo, 2. dados básicos, 3. descritivo/itens, 4. anexos, 5. revisar e enviar) — fica bem "appzão", ótimo no celular.
- Ou formulário único, scroll vertical, mais rápido pra quem já conhece.

Minha recomendação: **Opção A + wizard em passos**, responsivo (mobile-first), reaproveitando os mesmos componentes que já temos (`SelectCreatable`, `EntitySearchSelect`, anexos). Fica pronto rápido e cobre o caso "a pessoa abre no celular e manda a solicitação". Se depois precisar abrir pra fora, evoluímos pra Opção B com as proteções certas.

### Pergunta antes de implementar a parte 3
Você quer:
- **(A)** formulário interno (só usuários logados), ou
- **(B)** link público que qualquer pessoa abre sem conta?

E prefere **wizard em passos** ou **formulário único**?

---

## Resumo técnico (para referência)

- `src/components/DemandaDialog.tsx`: estado `pendingFiles` quando `!demandaId`; mutação `save` faz upload dos pendentes após criar a demanda.
- `src/lib/demandas.ts`: deixar de re-exportar de `compras.ts`; definir `DEMANDA_STATUSES` próprio com os 7 status na ordem pedida e cores correspondentes.
- `src/routes/financeiro.index.tsx` e `src/routes/financeiro.dashboard.tsx`: continuam funcionando — já consomem `DEMANDA_STATUSES`.
- Parte 3 fica fora deste plano até você escolher A/B + formato; implemento em seguida.