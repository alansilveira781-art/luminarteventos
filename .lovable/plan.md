## Plano — finalizar pendências

A central de notificações (modal sobre a tela atual + bolinha = pendentes) já foi implementada em iteração anterior. Resta concluir os 3 itens abaixo.

### 1. Aba de Configurações (Compras e Comercial)

Criar duas rotas admin-only com a mesma estrutura visual:

- `src/routes/compras.configuracoes.tsx` (acessível só a admin do módulo `compras` ou admin geral)
- `src/routes/comercial.configuracoes.tsx` (admin do módulo `comercial` ou admin geral)

Cada página lista os status do kanban respectivo em uma tabela com uma coluna "Responsável padrão" — um Select carregando usuários com acesso ao módulo. Salvar grava em `compras_status_defaults` / `comercial_status_defaults` (tabelas já criadas) usando `status` como chave (upsert). Botão "Limpar" remove o default daquele status.

Adicionar item "Configurações" no `AppSidebar` para Compras e Comercial, visível apenas para admins do módulo.

### 2. Aplicar responsável padrão ao mover card

- **Compras** (`src/store.ts` / handler de drag no `compras.index.tsx`): em `moveStatus`, antes/depois de atualizar o status, ler `compras_status_defaults` do novo status; se existir, sobrescrever `responsavel_id` e `responsavel_nome` do card (sem abrir o `AvancarCardDialog`). Se não houver default, manter fluxo atual.
- **Comercial** (`moveCard`): mesmo padrão usando `comercial_status_defaults`. Sobrescreve `card.responsavel` sempre que houver default configurado para o novo status.

Carregar os defaults uma vez no store (cache em memória, recarregar quando a tela de Configurações salva).

### 3. Comercial — data de envio e nova versão

- **Data de envio no card do Kanban**: quando o card está em `orcamento_enviado`, exibir uma linha pequena no `KanbanCard` (`Enviado: dd/MM`) lendo `dataEnvio`. O drawer já mostra. *(Observação: na rodada anterior você pediu "só no drawer". Confirme se mantemos só no drawer ou se agora quer também no card — pelo texto desta mensagem, "fique registrado no cartão" sugere mostrar no card. Vou assumir **no card** salvo indicação contrária.)*
- **Criar nova versão**: no `DetalhesDrawer`, ao clicar "Criar nova versão":
  1. Clonar dados da proposta atual (cliente, itens, condições, observações) em um rascunho de nova versão.
  2. Mover o card para o status `projeto`.
  3. Fechar o drawer e abrir o `PropostaWizard` em `comercial.index.tsx` pré-preenchido com o clone, em modo edição, salvando como `versao = atual.versao + 1` ao concluir.

### Arquivos afetados

**Criar**: `src/routes/compras.configuracoes.tsx`, `src/routes/comercial.configuracoes.tsx`.

**Editar**: `src/components/AppSidebar.tsx` (entradas de menu admin-only), `src/store.ts` ou stores específicos (lógica de defaults em `moveStatus`/`moveCard`), `src/routes/compras.index.tsx`, `src/routes/comercial.index.tsx` (handler de abrir wizard pré-preenchido), `src/components/comercial/DetalhesDrawer.tsx` (botão "Criar nova versão" dispara callback), `src/components/comercial/KanbanCard.tsx` (exibir `dataEnvio` quando status = `orcamento_enviado`, se confirmado).

Sem migrações novas — as tabelas `compras_status_defaults` e `comercial_status_defaults` já existem.
