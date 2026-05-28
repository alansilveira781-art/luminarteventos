# Plano — Notificações, Responsáveis padrão e Fluxo de Propostas

## 1. Central de Notificações como modal

- Transformar a rota `/notificacoes` em um **componente modal** (`NotificacoesDialog`) usando `Dialog` do shadcn, mantendo todo o conteúdo atual (filtros, lista, ações concluir/abrir/excluir).
- Substituir o `<Link to="/notificacoes">` no `NotificationBell` e no rodapé "Ver todas" por um botão que abre o `NotificacoesDialog` por cima da tela atual, com botão **Fechar** no rodapé.
- Manter a rota `/notificacoes` como fallback (renderiza o mesmo conteúdo), mas a navegação principal passa a ser via modal.

## 2. Sininho — bolinha = pendentes

- Em `NotificationBell.tsx`, trocar o critério da bolinha vermelha:
  - **Antes:** `unread = notificações não lidas`
  - **Depois:** `pendentes = notificações com concluida=false`
- O número exibido passa a refletir pendentes (limite "9+"). Marcar todas como lidas continua existindo, mas a bolinha só some quando o usuário concluir a notificação.

## 3. Aba de Configurações (Compras e Comercial)

Criar uma nova aba **Configurações** dentro de cada módulo:

- **Compras:** nova rota `/compras/configuracoes` (sub-rota de `compras.tsx`).
- **Comercial:** nova rota `/comercial/configuracoes` (sub-rota de `comercial.tsx`).
- Visível apenas para admin geral ou admin do módulo (mesmo padrão usado em `comercial.validacoes`).

Conteúdo da aba: tabela "Responsável padrão por status" — uma linha para cada status do módulo, com um `Select` carregando a lista de usuários (`profiles`).

**Persistência:**
- Compras: nova tabela `compras_status_defaults` (status PK + `responsavel_id` + `responsavel_nome`) com RLS por módulo.
- Comercial: nova tabela `comercial_status_defaults` (mesma estrutura).

**Aplicação automática** (regra "um responsável padrão por status — sobrescreve"):
- Compras (`compras.index.tsx` → `moveStatus`): ao mover card, se existir default para o novo status, aplica `responsavel_id/nome` automaticamente (sem abrir `AvancarCardDialog`). Se não houver default, mantém o fluxo atual de perguntar.
- Comercial (`comercial.index.tsx` → handler de move): ao mover card entre colunas, aplica o `responsavel` configurado para aquele status sobrescrevendo `card.responsavel`.

## 4. Data de envio (Comercial)

Já existe `card.dataEnvio` salvo via `EnvioDialog` ao mover para "Orçamento Enviado", e o `DetalhesDrawer` já exibe quando preenchido. Confirmar que:
- `moveCard` em `store.ts` continua persistindo `dataEnvio` ao entrar em `orcamento_enviado`.
- `DetalhesDrawer` mostra "Data de envio" com `fmt()` (já implementado nas linhas 64–66).

Nenhuma alteração visível no card do Kanban (conforme escolha do usuário).

## 5. Nova versão de proposta com wizard pré-preenchido

Atualmente `criarNovaVersaoProposta` (em `store.ts`) já cria a versão e move o card para `projeto`, mas o usuário precisa abrir o wizard manualmente.

Mudanças:
- `DetalhesDrawer` → botão "Criar nova versão":
  1. Chama `criarNovaVersaoProposta(atual.id)`.
  2. Fecha o drawer.
  3. Dispara abertura do `PropostaWizard` da página `comercial.index.tsx` passando a nova proposta como `proposta` (modo edição), já com todos os campos clonados da versão anterior (cliente, evento, ambientes, custos, resumo, responsável).
- Como o drawer não controla o wizard, usar um **evento custom** (`window.dispatchEvent(new CustomEvent('comercial:openWizard', { detail: { propostaId } }))`) ou um callback `onCriarNovaVersao` propagado pelo componente pai. Preferência: callback explícito via prop nova `onOpenWizard(propostaId)` no `DetalhesDrawer`, ligado ao state do wizard em `comercial.index.tsx`.

## Arquivos afetados

**Criar:**
- `src/components/NotificacoesDialog.tsx` (modal central)
- `src/routes/compras.configuracoes.tsx`
- `src/routes/comercial.configuracoes.tsx`
- `supabase/migrations/...` — tabelas `compras_status_defaults` e `comercial_status_defaults` com GRANT + RLS

**Editar:**
- `src/components/NotificationBell.tsx` — bolinha por pendentes + abrir modal
- `src/routes/notificacoes.tsx` — usar `NotificacoesDialog` internamente (manter rota como fallback)
- `src/components/AppSidebar.tsx` — entradas "Configurações" em Compras e Comercial (admin only)
- `src/routes/compras.index.tsx` — aplicar default ao mover; pular dialog se default existir
- `src/routes/comercial.index.tsx` — aplicar default ao mover card; expor abertura do wizard via callback do drawer
- `src/components/comercial/DetalhesDrawer.tsx` — nova prop `onOpenWizard`; usar no botão "Criar nova versão"

## Detalhes técnicos

- **RLS das novas tabelas:** `has_module_access(auth.uid(), 'compras')` / `'comercial')` para SELECT; INSERT/UPDATE/DELETE restritos a `is_module_admin(auth.uid(), ...)`.
- **Modal de notificações:** `<Dialog>` largura `max-w-3xl`, altura limitada com `max-h-[80vh] overflow-y-auto`, rodapé com botão "Fechar".
- **Default por status (Compras):** carregado via React Query (`compras-status-defaults`) e consultado dentro do `onDragEnd` antes de decidir entre aplicar direto ou abrir `AvancarCardDialog`.
- **Comercial wizard pré-preenchido:** o `PropostaWizard` já aceita `proposta` para edição; basta passar a nova proposta retornada por `criarNovaVersaoProposta` (que é cópia completa da anterior).
