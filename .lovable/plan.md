## Objetivo
Eliminar o delay entre cadastro/edição/entrada/saída e a tela de Estoque, garantindo que a quantidade e o status mudem imediatamente e de forma consistente.

## Diagnóstico encontrado
- Os triggers que atualizam estoque/status continuam ausentes no banco para `itens`, `movimentacoes` e `movimentacao_itens`.
- Sem esses triggers, a quantidade até pode ser atualizada por alguns fluxos do app, mas o status automático (`sem_estoque`, `baixo_estoque`, `disponivel`) não acompanha corretamente.
- O app usa sincronização em tempo real para `itens` e `movimentacoes`, mas `movimentacao_itens` não está publicado no realtime. Isso pode causar demora/ausência de atualização em lançamentos com vários itens.
- A saúde do backend está ok: conexões baixas, banco online, sem sinal claro de saturação. O delay parece ser de lógica/sincronização, não de infraestrutura.

## Plano de correção
1. **Reativar a automação do banco**
   - Criar uma migração para recriar os triggers de estoque:
     - entrada soma estoque;
     - saída baixa estoque;
     - devolução/ajuste aplica o saldo correto;
     - exclusão reverte o movimento;
     - alteração de quantidade/status recalcula o status do item.
   - Recalcular uma vez o status dos itens atuais para corrigir itens que já ficaram divergentes.

2. **Corrigir ajuste manual de quantidade no cadastro/edição do item**
   - Hoje o formulário permite editar `quantidade_atual` diretamente na tabela de itens.
   - Vou ajustar para que, quando a quantidade for alterada na edição de um item, o app registre uma movimentação de `ajuste` pela diferença entre a quantidade antiga e a nova.
   - Assim o histórico fica correto e os triggers atualizam quantidade/status imediatamente.

3. **Melhorar atualização imediata da interface**
   - Incluir `movimentacao_itens` na sincronização em tempo real do estoque.
   - Após salvar item/entrada/saída/devolução, invalidar também as queries relacionadas ao item e às listas usadas nos formulários.
   - Usar atualização otimista ou refetch direto após salvar o item para reduzir a sensação de espera.

4. **Validar o fluxo principal**
   - Editar um item para quantidade 0: deve mudar para `sem_estoque` rapidamente.
   - Ajustar de 0 para acima do mínimo: deve mudar para `disponivel`.
   - Dar entrada e saída: estoque deve refletir na tela e no formulário de saída sem aguardar muitos segundos.

## Detalhes técnicos
- Banco: migração para triggers/publicação realtime/reprocessamento de status.
- Frontend: ajustes principalmente em `src/routes/estoque.index.tsx`, possivelmente `src/hooks/useEstoqueRealtimeSync.ts` e formulários/rotas de movimentação caso falte invalidação após mutações.
- Não vou alterar o Painel Financeiro nem a integração Conta Azul neste ajuste.